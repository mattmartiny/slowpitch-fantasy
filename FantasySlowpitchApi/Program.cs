using System.Text;
using FantasySlowpitchApi.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ==============================
// CONFIG (IIS-SAFE, EXPLICIT)
// ==============================
builder.Configuration
    .SetBasePath(builder.Environment.ContentRootPath)
    .AddJsonFile("appsettings.json", optional: false)
    .AddJsonFile(
        $"appsettings.{builder.Environment.EnvironmentName}.json",
        optional: true
    )
    .AddEnvironmentVariables();

var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    Console.WriteLine("❌ JWT Key missing (app will start, auth will fail)");
}

// ==============================
// SERVICES
// ==============================
builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("Default")
    );
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins("https://sbfantasy.mattmartiny.com")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    jwtKey ?? "TEMP_DEV_KEY_32_CHARS_LONG____"
                )
            ),

            ValidateIssuer = !string.IsNullOrWhiteSpace(jwtIssuer),
            ValidateAudience = !string.IsNullOrWhiteSpace(jwtAudience),
            ValidateLifetime = true,

            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience
        };
    });

builder.Services.AddAuthorization();

// ==============================
// BUILD
// ==============================
var app = builder.Build();

Console.WriteLine("LOGIN START");
if (app.Environment.IsProduction())
{
    app.UseDeveloperExceptionPage();
}

Console.WriteLine($"CONTENT ROOT: {app.Environment.ContentRootPath}");
Console.WriteLine($"ENVIRONMENT: {app.Environment.EnvironmentName}");

// ==============================
// MIDDLEWARE (ORDER MATTERS)
// ==============================
// app.UseHttpsRedirection(); // ❌ IIS already handles HTTPS

app.UseRouting();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

// ==============================
// ENDPOINTS
// ==============================
app.MapControllers();

app.MapGet("/health", () => Results.Ok(new
{
    status = "Slowpitch Fantasy API running",
    environment = app.Environment.EnvironmentName,
    time = DateTime.UtcNow
}));

app.Run();
