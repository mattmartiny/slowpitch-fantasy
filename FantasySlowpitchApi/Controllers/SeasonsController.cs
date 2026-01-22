using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;
using FantasySlowpitchApi.Data;
using Microsoft.EntityFrameworkCore;

namespace FantasySlowpitchApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SeasonsController : ControllerBase
{

    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    public SeasonsController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }


    [HttpPost("new")]
public async Task<IActionResult> StartNewSeason()
{
    using var conn = new SqlConnection(
        _config.GetConnectionString("Default")
    );

    using var cmd = new SqlCommand("dbo.start_new_season", conn);
    cmd.CommandType = CommandType.StoredProcedure;
    cmd.Parameters.AddWithValue("@season_name", DBNull.Value);

    await conn.OpenAsync();

    var result = await cmd.ExecuteScalarAsync();

    if (result == null || result == DBNull.Value)
        return StatusCode(500, "Failed to create season");

    var seasonId = Convert.ToInt32(result);

    return Created("", new { seasonId });
}

 [HttpGet("current")]
public async Task<IActionResult> GetCurrentSeason()
{
    var season = await _db.Seasons
        .Where(s => s.IsActive)
        .Select(s => new
        {
            seasonId = s.SeasonId,
            currentWeek = s.CurrentWeek,
            isLocked = s.IsLocked
        })
        .FirstOrDefaultAsync();

    if (season == null)
        return NotFound("No active season");

    return Ok(season);
}

    [HttpPost("{seasonId}/draft")]
    public async Task<IActionResult> SaveDraft(
      int seasonId,
      [FromBody] List<DraftPickDto> picks
  )
    {
        if (picks == null || picks.Count == 0)
            return BadRequest("No draft picks provided");

        var conn = _db.Database.GetDbConnection();
        await conn.OpenAsync();

        // Clear existing draft for this season (safe to re-save)
        await using (var clearCmd = conn.CreateCommand())
        {
            clearCmd.CommandText = @"
            DELETE FROM mattmar1_mmartiny.season_team_players
            WHERE season_id = @seasonId;
        ";
            clearCmd.Parameters.Add(new SqlParameter("@seasonId", seasonId));
            await clearCmd.ExecuteNonQueryAsync();
        }

        // Insert draft picks
        foreach (var p in picks)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
            INSERT INTO mattmar1_mmartiny.season_team_players
              (season_id, teamId, playerId)
            VALUES
              (@seasonId, @teamId, @playerId);
        ";

            cmd.Parameters.Add(new SqlParameter("@seasonId", seasonId));
            cmd.Parameters.Add(new SqlParameter("@teamId", p.TeamId));
            cmd.Parameters.Add(new SqlParameter("@playerId", p.PlayerId));

            await cmd.ExecuteNonQueryAsync();
        }

        return Ok(new { saved = picks.Count });
    }


    [HttpGet("{seasonId}/draft")]
    public async Task<IActionResult> GetDraft(int seasonId)
    {
        var results = new List<object>();

        using var conn = new SqlConnection(
            _config.GetConnectionString("Default")
        );
        await conn.OpenAsync();

        var cmd = new SqlCommand(@"
        SELECT teamId, playerId
        FROM mattmar1_mmartiny.season_team_players
        WHERE season_id = @seasonId
    ", conn);

        cmd.Parameters.AddWithValue("@seasonId", seasonId);

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            results.Add(new
            {
                teamId = reader.GetGuid(0),
                playerId = reader.GetGuid(1)
            });
        }

        return Ok(results);
    }


[HttpPost("{seasonId:int}/advance-week")]
public async Task<IActionResult> AdvanceWeek(int seasonId)
{
    var season = await _db.Seasons.FirstOrDefaultAsync(s => s.SeasonId == seasonId);
    if (season == null) return NotFound();

    if (season.IsLocked)
        return BadRequest("Season is locked.");

    season.CurrentWeek += 1;
    await _db.SaveChangesAsync();

    return Ok(new { seasonId, currentWeek = season.CurrentWeek });
}

[HttpPost("{seasonId:int}/set-week/{week:int}")]
public async Task<IActionResult> SetWeek(int seasonId, int week)
{
    if (week < 1)
        return BadRequest("Week must be >= 1");

    // 🔒 STEP 1: lock guard
    var isLocked = await _db.Seasons
        .Where(s => s.SeasonId == seasonId)
        .Select(s => s.IsLocked)
        .FirstOrDefaultAsync();

    if (isLocked)
        return BadRequest("Season is locked.");

    // 🔄 STEP 2: set authoritative week
    await _db.Database.ExecuteSqlRawAsync(@"
        UPDATE weekly_state
        SET current_week = @week
        WHERE season_id = @seasonId
    ",
    new SqlParameter("@seasonId", seasonId),
    new SqlParameter("@week", week)
    );

    return Ok(new { seasonId, currentWeek = week });
}


[HttpGet("{seasonId}/teams")]
public async Task<IActionResult> GetSeasonTeams(int seasonId)
{
    var teams = await _db.Teams
        .Select(t => new {
            teamId = t.TeamId.ToString(),
            name = t.Name
        })
        .ToListAsync();

    return Ok(teams);
}

}

