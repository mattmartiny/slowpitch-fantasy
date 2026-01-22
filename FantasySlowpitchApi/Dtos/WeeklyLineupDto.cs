using System.Text.Json.Serialization;

public class WeeklyLineupDto
{
    public string TeamId { get; set; } = "";
    public string Night { get; set; } = ""; // "MON" | "FRI"
    public List<string> Active { get; set; } = new();
}
public class WeeklyLineupRequest
{
    public Guid TeamId { get; set; }
    public string Night { get; set; } = "MON";
    public List<Guid> Active { get; set; } = new();
}
