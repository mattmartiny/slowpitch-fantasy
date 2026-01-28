using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasySlowpitchApi.Models;

[Table("weekly_lineups")]
public class WeeklyLineup
{
    [Key]
    public int Id { get; set; }

    [Column("season_id")]
    public int SeasonId { get; set; }

    [Column("week")]
    public int Week { get; set; }

    [Column("teamId")]
    public Guid TeamId { get; set; }

    [Column("playerId")]
    public Guid PlayerId { get; set; }

    [Column("night")]
    public string Night { get; set; } = "";

    [Column("slot")]
    public string Slot { get; set; } = "";

    [Column("createdAt")]
    public DateTime CreatedAt { get; set; }
}
