public class LineupSnapshot
{
    public int LineupId { get; set; }
    public int SeasonId { get; set; }
    public Guid TeamId { get; set; }
    public DateTime CreatedAt { get; set; }

public ICollection<LineupSnapshotPlayer> Players { get; set; }
    = new List<LineupSnapshotPlayer>();
}