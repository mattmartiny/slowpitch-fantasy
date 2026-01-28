public class LineupSnapshotPlayer
{
    public int LineupId { get; set; }
    public Guid PlayerId { get; set; }

    public string Slot { get; set; } = "";
    public bool IsCaptain { get; set; }

    public LineupSnapshot LineupSnapshot { get; set; } = null!;
}
