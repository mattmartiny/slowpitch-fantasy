using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using FantasySlowpitchApi.Data;
using Microsoft.AspNetCore.Authorization;
namespace FantasySlowpitchApi.Controllers;


[AllowAnonymous]
[ApiController]
[Route("[controller]")]
public class PlayersController : ControllerBase
{
    private readonly AppDbContext _db;

    public PlayersController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/players
    [HttpGet]
    public async Task<IActionResult> GetPlayers()
    {
        var outList = new List<object>();

        var conn = _db.Database.GetDbConnection();
        await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT playerId, name
            FROM mattmar1_mmartiny.players
            ORDER BY name;
        ";

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            // playerId is UNIQUEIDENTIFIER in SQL Server
            var playerId = reader.GetGuid(0);
            var displayName = reader.GetString(1);
            var name = displayName.Trim();
            outList.Add(new
            {
                playerId = playerId.ToString(),
                name
            });
        }

        return Ok(outList);
    }

    [HttpPost("sync")]
    public async Task<IActionResult> SyncPlayers([FromBody] List<PlayerSyncDto> players)
    {

        if (User.IsInRole("visitor"))
    return Forbid();

        var conn = _db.Database.GetDbConnection();
        await conn.OpenAsync();

        foreach (var p in players)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
    IF NOT EXISTS (
        SELECT 1
        FROM mattmar1_mmartiny.players
        WHERE LOWER(name) = LOWER(@name)
    )
    INSERT INTO mattmar1_mmartiny.players (playerId, name)
    VALUES (NEWID(), @name);
";

            cmd.Parameters.Add(new SqlParameter("@name", p.DisplayName));

            await cmd.ExecuteNonQueryAsync();

            await cmd.ExecuteNonQueryAsync();
        }

        return Ok();
    }


}

