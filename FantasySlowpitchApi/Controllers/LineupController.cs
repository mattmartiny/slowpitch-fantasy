using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using FantasySlowpitchApi.Data;
[ApiController]
[Route("api/lineups")]
public class LineupsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public LineupsController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpGet("{seasonId:int}/{week:int}")]
    public async Task<IActionResult> GetWeeklyLineups(int seasonId, int week)
    {
        var lineup = await _db.Database
            .SqlQueryRaw<WeeklyLineupRow>(@"
                SELECT teamId AS TeamId,
                       playerId AS PlayerId,
                       slot,
                       night
                FROM weekly_lineups
                WHERE season_id = @seasonId
                  AND week = @week
            ",
            new SqlParameter("@seasonId", seasonId),
            new SqlParameter("@week", week)
            )
            .ToListAsync();

        return Ok(new { lineup });
    }

    [HttpPost("{seasonId:int}/{week:int}")]
    public async Task<IActionResult> SaveWeeklyLineup(
        int seasonId,
        int week,
        [FromBody] WeeklyLineupDto dto
    )
    {
        if (dto == null || dto.Active == null)
            return BadRequest("Invalid payload");

        if (dto.Night != "MON" && dto.Night != "FRI")
            return BadRequest("Invalid night");

        using var conn = new SqlConnection(
            _config.GetConnectionString("Default")
        );
        await conn.OpenAsync();

        using var tx = conn.BeginTransaction();

        try
        {
            using (var delete = new SqlCommand(@"
                DELETE FROM weekly_lineups
                WHERE season_id = @seasonId
                  AND week = @week
                  AND teamId = @teamId
                  AND night = @night
            ", conn, tx))
            {
                delete.Parameters.AddWithValue("@seasonId", seasonId);
                delete.Parameters.AddWithValue("@week", week);
                delete.Parameters.AddWithValue("@teamId", dto.TeamId);
                delete.Parameters.AddWithValue("@night", dto.Night);
                await delete.ExecuteNonQueryAsync();
            }

            foreach (var playerId in dto.Active)
            {
                using var insert = new SqlCommand(@"
                    INSERT INTO weekly_lineups
                        (season_id, week, teamid, night, playerId, slot)
                    VALUES
                        (@seasonId, @week, @teamId, @night, @playerId, 'active')
                ", conn, tx);

                insert.Parameters.AddWithValue("@seasonId", seasonId);
                insert.Parameters.AddWithValue("@week", week);
                insert.Parameters.AddWithValue("@teamId", dto.TeamId);
                insert.Parameters.AddWithValue("@night", dto.Night);
                insert.Parameters.AddWithValue("@playerId", playerId);

                await insert.ExecuteNonQueryAsync();
            }

            tx.Commit();
            return Ok(new { saved = dto.Active.Count });
        }
        catch (Exception ex)
        {
            tx.Rollback();
            return StatusCode(500, ex.Message);
        }
    }

    public class WeeklyLineupDto
    {
        public Guid TeamId { get; set; }
        public string Night { get; set; } = "";
        public List<Guid> Active { get; set; } = new();
    }

    public class WeeklyLineupRow
    {
        public Guid TeamId { get; set; }
        public Guid PlayerId { get; set; }
        public string Slot { get; set; } = "";
        public string Night { get; set; } = "";
    }
}
