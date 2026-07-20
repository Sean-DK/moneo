using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Moneo.Api.Common;
using Moneo.Api.Data;
using Moneo.Api.Features.Auth;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddDbContext<AppDbContext>(opt =>
{
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default"));
});

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? throw new InvalidOperationException("Missing Cors:AllowedOrigins configuration.");

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod()));

// --- Auth configuration ---
builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection(AuthOptions.SectionName));
builder.Services.AddScoped<TokenService>();

var authOptions = builder.Configuration.GetSection(AuthOptions.SectionName).Get<AuthOptions>()
    ?? throw new InvalidOperationException("Missing Auth configuration section.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = authOptions.JwtIssuer,
            ValidateAudience = true,
            ValidAudience = authOptions.JwtAudience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(authOptions.JwtSigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });

// Dev bypass is ONLY honored in Development — a stray UseDevUser=true in
// production config can never disable auth.
var devBypass = builder.Environment.IsDevelopment() && authOptions.UseDevUser;

builder.Services.AddAuthorization(o =>
{
    o.DefaultPolicy = devBypass
        ? new AuthorizationPolicyBuilder().RequireAssertion(_ => true).Build()
        : new AuthorizationPolicyBuilder(JwtBearerDefaults.AuthenticationScheme)
            .RequireAuthenticatedUser().Build();
});

builder.Services.AddHttpContextAccessor();

if (devBypass)
{
    builder.Services.AddScoped<ICurrentUserAccessor, DevCurrentUserAccessor>();
    Console.WriteLine("⚠  AUTH BYPASS ACTIVE — running all requests as the dev user.");
}
else
{
    builder.Services.AddScoped<ICurrentUserAccessor, JwtCurrentUserAccessor>();
}

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapEndpoints();

app.Run();