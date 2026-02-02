namespace FantasySlowpitchApi.Models
{
    public class User
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = "";
        public string PinHash { get; set; } = "";

        public string Role { get; set; } = "player";
        public DateTime CreatedAt { get; set; }
    }
}
