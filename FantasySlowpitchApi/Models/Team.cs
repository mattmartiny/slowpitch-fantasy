using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasySlowpitchApi.Models
{
    [Table("Teams")]
    public class Team
    {
        [Key]
        [Column("teamId")]
        public Guid TeamId { get; set; }

        [Column("seasonId")]
        public int SeasonId { get; set; }

        [Column("name")]
        public string Name { get; set; } = "";
    }
}
