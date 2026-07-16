using Moneo.Api.Common;
using FluentValidation;
using Moneo.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddDbContext<AppDbContext>(opt =>
    {
        opt.UseSqlServer(builder.Configuration.GetConnectionString("Default"));
    });

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:5173", "http://localhost").AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddScoped<ICurrentUserAccessor, DevCurrentUserAccessor>();

var app = builder.Build();

app.UseCors();

app.MapEndpoints();

app.Run();