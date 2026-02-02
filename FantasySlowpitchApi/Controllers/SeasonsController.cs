using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;
using FantasySlowpitchApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using FantasySlowpitchApi.Models;

namespace FantasySlowpitchApi.Controllers;

[ApiController]
[Route("[controller]")]
public class SeasonsController : ControllerBase
{

    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    public SeasonsController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpPost("{seasonId}/draft")]
    public async Task<IActionResult> SaveDraft(
       int seasonId,
       [FromBody] List<SeasonDraft> picks
   )
    {
        if (picks == null || picks.Count == 0)
            return BadRequest("No draft picks provided");

        // 🔁 Idempotent save — clear existing draft
        var existing = _db.SeasonDrafts
            .Where(d => d.SeasonId == seasonId);

        _db.SeasonDrafts.RemoveRange(existing);

        foreach (var pick in picks)
        {
            _db.SeasonDrafts.Add(new SeasonDraft
            {
                SeasonId = seasonId,
                TeamId = pick.TeamId,
                PlayerId = pick.PlayerId
            });
        }

        await _db.SaveChangesAsync();

        return Ok();
    }

    [HttpPost("new")]
    public async Task<IActionResult> StartNewSeason()
    {
        if (User.IsInRole("visitor"))
            return Forbid();


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
    [AllowAnonymous]
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


    [HttpGet("{seasonId}/draft")]
    public async Task<IActionResult> GetDraft(int seasonId)
    {
        var draft = await _db.SeasonDrafts
            .Where(d => d.SeasonId == seasonId)
            .Select(d => new
            {
                d.TeamId,
                d.PlayerId
            })
            .ToListAsync();

        return Ok(draft);
    }


    [HttpPost("{seasonId:int}/advance-week")]
    public async Task<IActionResult> AdvanceWeek(int seasonId)
    {

        if (User.IsInRole("visitor"))
            return Forbid();
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
            .Select(t => new
            {
                teamId = t.TeamId,
                name = t.Name,
                ownerUserId = t.OwnerUserId,
                captainKey = t.CaptainKey
            })
            .ToListAsync();

        return Ok(teams);
    }

}

