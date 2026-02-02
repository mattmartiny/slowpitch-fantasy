using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasySlowpitchApi.Data;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FantasySlowpitchApi.Models;
using Microsoft.AspNetCore.Authorization;

namespace FantasySlowpitchApi.Controllers
{
    [ApiController]
    [AllowAnonymous]
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



        [HttpGet("debug-db")]
        public IActionResult DebugDb()
        {
            try
            {
                using var conn = _db.Database.GetDbConnection();
                conn.Open();

                return Ok(new
                {
                    conn.DataSource,
                    conn.Database,
                    State = conn.State.ToString()
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    error = ex.Message,
                    inner = ex.InnerException?.Message
                });
            }
        }


        private string CreateJwt(User user, Guid? teamId)
        {
            var claims = new List<Claim>
    {
        new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
        new Claim(JwtRegisteredClaimNames.UniqueName, user.Name),
        new Claim("name", user.Name),
        new Claim(ClaimTypes.Role, user.Role), //
    };

            if (teamId.HasValue)
            {
                claims.Add(new Claim("teamId", teamId.Value.ToString()));
            }

#pragma warning disable CS8604 // Possible null reference argument.
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config["Jwt:Key"])
            );
#pragma warning restore CS8604 // Possible null reference argument.

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

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
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            if (req == null)
            {
                return BadRequest("Request body missing");
            }

            if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Pin))
            {
                return BadRequest("Missing credentials");
            }

            Console.WriteLine("🔥 LOGIN ENDPOINT HIT");

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

            var team = await _db.Teams
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.OwnerUserId == user.Id);

            var valid = BCrypt.Net.BCrypt.Verify(rawPin, user.PinHash);
            Console.WriteLine($"HASH VERIFY RESULT: {valid}");

            if (!valid)
            {
                Console.WriteLine("❌ PIN MISMATCH");
                return Unauthorized("Invalid pin");
            }

            Console.WriteLine("✅ LOGIN SUCCESS");
            Console.WriteLine("🔥 NEW JWT CODE HIT 🔥");

            var token = CreateJwt(user, team?.TeamId);
            return Ok(new { token });
        }

    }

    public record LoginRequest(string Name, string Pin);
}

