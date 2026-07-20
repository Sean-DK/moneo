using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Moneo.Api.Common;
using Moneo.Api.Data;
using Moneo.Api.Data.Entities;

namespace Moneo.Api.Features.Auth
{
    public record TokenPair(string AccessToken, string RefreshToken, DateTimeOffset AccessExpiresAt);

    public class TokenService(AppDbContext db, IOptions<AuthOptions> options)
    {
        private readonly AuthOptions _opt = options.Value;

        public async Task<TokenPair> IssueAsync(User user, CancellationToken ct)
        {
            var now = DateTimeOffset.UtcNow;
            var accessExpires = now.Add(_opt.AccessTokenLifetime);

            var claims = new[]
            {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("name", user.DisplayName),
        };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opt.JwtSigningKey));
            var token = new JwtSecurityToken(
                issuer: _opt.JwtIssuer,
                audience: _opt.JwtAudience,
                claims: claims,
                expires: accessExpires.UtcDateTime,
                signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

            var accessToken = new JwtSecurityTokenHandler().WriteToken(token);

            // Refresh token: opaque random value, only its hash is stored.
            var refreshRaw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
            db.RefreshTokens.Add(new RefreshToken
            {
                Id = Guid.CreateVersion7(),
                TokenHash = Hash(refreshRaw),
                UserId = user.Id,
                CreatedAt = now,
                ExpiresAt = now.Add(_opt.RefreshTokenLifetime),
            });
            await db.SaveChangesAsync(ct);

            return new TokenPair(accessToken, refreshRaw, accessExpires);
        }

        /// <summary>Rotate a refresh token: validate, revoke, issue a new pair.</summary>
        public async Task<TokenPair?> RefreshAsync(string refreshToken, CancellationToken ct)
        {
            var hash = Hash(refreshToken);
            var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

            if (stored is null) return null;

            // Reuse detection: a revoked token being presented means it was stolen
            // (or the client raced). Revoke the whole chain for that user.
            if (stored.RevokedAt is not null)
            {
                var all = await db.RefreshTokens
                    .Where(t => t.UserId == stored.UserId && t.RevokedAt == null)
                    .ToListAsync(ct);
                foreach (var t in all) t.RevokedAt = DateTimeOffset.UtcNow;
                await db.SaveChangesAsync(ct);
                return null;
            }

            if (stored.ExpiresAt <= DateTimeOffset.UtcNow) return null;

            var user = await db.Users.FindAsync([stored.UserId], ct);
            if (user is null) return null;

            stored.RevokedAt = DateTimeOffset.UtcNow;
            var pair = await IssueAsync(user, ct);   // saves the new token

            // Link for auditability
            var newHash = Hash(pair.RefreshToken);
            var replacement = await db.RefreshTokens.FirstAsync(t => t.TokenHash == newHash, ct);
            stored.ReplacedById = replacement.Id;
            await db.SaveChangesAsync(ct);

            return pair;
        }

        public async Task RevokeAllAsync(Guid userId, CancellationToken ct)
        {
            var tokens = await db.RefreshTokens
                .Where(t => t.UserId == userId && t.RevokedAt == null)
                .ToListAsync(ct);
            foreach (var t in tokens) t.RevokedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
        }

        private static string Hash(string value) =>
            Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    }
}