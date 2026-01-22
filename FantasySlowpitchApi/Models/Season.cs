using System.ComponentModel.DataAnnotations.Schema;

namespace FantasySlowpitchApi.Models
{
    [Table("Seasons")]
    public class Season
    {
        [Column("season_id")]
        public int SeasonId { get; set; }

        [Column("name")]
        public string Name { get; set; } = "";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("is_locked")]
        public bool IsLocked { get; set; }

        [Column("current_week")]
        public int CurrentWeek { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; }
    }
}
