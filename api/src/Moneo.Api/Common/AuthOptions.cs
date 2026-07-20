namespace Moneo.Api.Common
{
    public class AuthOptions
    {
        public const string SectionName = "Auth";

        public string GoogleClientId { get; set; } = null!;

        public string JwtSigningKey { get; set; } = null!;

        public string JwtIssuer { get; set; } = "moneo";

        public string JwtAudience { get; set; } = "moneo-app";

        public TimeSpan AccessTokenLifetime { get; set; } = TimeSpan.FromHours(1);

        public TimeSpan RefreshTokenLifetime { get; set; } = TimeSpan.FromDays(90);

        public bool UseDevUser { get; set; }
    }
}
