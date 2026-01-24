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
        [Column("name")]
        public string Name { get; set; } = "";

        // 👇 THIS IS THE KEY
        [Column("ownerUserId")]
        public Guid OwnerUserId { get; set; }

        [Column("captainKey")]
        public string CaptainKey { get; set; } = "";
    }
}
