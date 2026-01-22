using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;
using FantasySlowpitchApi.Data;

namespace FantasySlowpitchApi.Controllers;

[ApiController]
[Route("api/scores")]
public class ScoresController : ControllerBase
{
    private readonly IConfiguration _config;

    public ScoresController(IConfiguration config)
    {
        _config = config;
    }

    // ✅ GET all scores for a season (history hydration)
    [HttpGet("season/{seasonId:int}")]
    public async Task<IActionResult> GetSeasonScores(int seasonId)
    {
        using var conn = new SqlConnection(
            _config.GetConnectionString("Default")
        );
        await conn.OpenAsync();

        var cmd = new SqlCommand(@"
            SELECT week, teamId, score
            FROM mattmar1_mmartiny.weekly_scores
            WHERE season_id = @seasonId
            ORDER BY week
        ", conn);

        cmd.Parameters.AddWithValue("@seasonId", seasonId);

        var result = new Dictionary<int, Dictionary<string, decimal>>();

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var week = reader.GetInt32(0);
            var teamId = reader.GetValue(1).ToString()!;
            var score = Convert.ToDecimal(reader.GetValue(2));

            if (!result.ContainsKey(week))
                result[week] = new Dictionary<string, decimal>();

            result[week][teamId] = score;
        }

        return Ok(result);
    }

    // ✅ POST scores for ONE week
    [HttpPost("{seasonId:int}/{week:int}")]
    public async Task<IActionResult> SaveWeeklyScores(
        int seasonId,
        int week,
        [FromBody] List<WeeklyScoreDto> scores
    )
    {
        using var conn = new SqlConnection(
            _config.GetConnectionString("Default")
        );
        await conn.OpenAsync();

        foreach (var s in scores)
        {
            var cmd = new SqlCommand(@"
                INSERT INTO mattmar1_mmartiny.weekly_scores
                  (season_id, week, teamId, score)
                VALUES
                  (@seasonId, @week, @teamId, @score)
            ", conn);

            cmd.Parameters.AddWithValue("@seasonId", seasonId);
            cmd.Parameters.AddWithValue("@week", week);
            cmd.Parameters.AddWithValue("@teamId", s.TeamId);
            cmd.Parameters.AddWithValue("@score", s.Score);

            await cmd.ExecuteNonQueryAsync();
        }

        return Ok();
    }
}
