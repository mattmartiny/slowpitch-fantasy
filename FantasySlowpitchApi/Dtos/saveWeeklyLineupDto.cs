public class SaveWeeklyLineupDto
{
    public Guid TeamId { get; set; }
    public Guid[] Active { get; set; } = [];
}
