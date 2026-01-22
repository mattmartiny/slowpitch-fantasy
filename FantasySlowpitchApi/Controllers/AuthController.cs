using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasySlowpitchApi.Data;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FantasySlowpitchApi.Models;

namespace FantasySlowpitchApi.Controllers
{
    [ApiController]
    [Route("auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;

        private readonly IConfiguration _config;

        public AuthController(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }
private string CreateJwt(User user)
{
    var claims = new[]
    {
        new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
        new Claim(JwtRegisteredClaimNames.UniqueName, user.Name),
        new Claim("name", user.Name)
    };

    var key = new SymmetricSecurityKey(
        Encoding.UTF8.GetBytes(_config["Jwt:Key"])
    );

    var creds = new SigningCredentials(
        key,
        SecurityAlgorithms.HmacSha256
    );

    var token = new JwtSecurityToken(
        issuer: _config["Jwt:Issuer"],
        audience: _config["Jwt:Audience"],
        claims: claims,
        expires: DateTime.UtcNow.AddDays(7),
        signingCredentials: creds
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
}


    [HttpPost("login")]
public async Task<IActionResult> Login(LoginRequest req)
{
    var rawName = req.Name;
    var rawPin = req.Pin;



    var name = rawName.Trim().ToLower();


    var allUsers = await _db.Users.ToListAsync();

    foreach (var u in allUsers)
    {
        Console.WriteLine($"DB USER → '{u.Name}' | hash len={u.PinHash.Length}");
    }

    var user = allUsers.FirstOrDefault(
        u => u.Name.Trim().ToLower() == name
    );

    if (user == null)
    {
        Console.WriteLine("❌ USER NOT FOUND");
        return Unauthorized("User not found");
    }

    var valid = BCrypt.Net.BCrypt.Verify(rawPin, user.PinHash);
    Console.WriteLine($"HASH VERIFY RESULT: {valid}");

    if (!valid)
    {
        Console.WriteLine("❌ PIN MISMATCH");
        return Unauthorized("Invalid pin");
    }

    Console.WriteLine("✅ LOGIN SUCCESS");

    var token = CreateJwt(user);
    return Ok(new { token });
}


        [HttpGet("debug-db")]
        public IActionResult DebugDb()
        {
            var conn = _db.Database.GetDbConnection();
            return Ok(new
            {
                conn.DataSource,
                conn.Database
            });
        }

    }

    public record LoginRequest(string Name, string Pin);
}

