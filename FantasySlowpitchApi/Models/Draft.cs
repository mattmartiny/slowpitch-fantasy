using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasySlowpitchApi.Models
{
    [Table("season_draft")]
    public class SeasonDraft
    {

        [Required]
        public int SeasonId { get; set; }

        [Required]
        public Guid TeamId { get; set; }

        [Required]
        public Guid PlayerId { get; set; }
    }
}
