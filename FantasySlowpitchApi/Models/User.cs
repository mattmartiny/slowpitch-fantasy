namespace FantasySlowpitchApi.Models
{
    public class User
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = "";
        public string PinHash { get; set; } = "";
        public DateTime CreatedAt { get; set; }
    }
}
