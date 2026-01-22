
using System.ComponentModel.DataAnnotations;

namespace FantasySlowpitchApi.Models
{
    public class UserState
    {
        [Key]                  // 👈 THIS IS THE FIX
        public Guid UserId { get; set; }

        public string StateJson { get; set; } = "{}";
        public DateTime UpdatedAt { get; set; }
    }
}
