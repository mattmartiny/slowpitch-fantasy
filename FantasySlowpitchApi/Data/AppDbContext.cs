using Microsoft.EntityFrameworkCore;
using FantasySlowpitchApi.Models;
using FantasySlowpitchApi.Controllers;

namespace FantasySlowpitchApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options) { }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<UserState> UserStates { get; set; } = null!;


        public DbSet<Season> Seasons { get; set; } = null!;
        public DbSet<Team> Teams { get; set; } = null!;
        public DbSet<SeasonDraft> SeasonDrafts { get; set; } = null!;

        public DbSet<LineupSnapshot> LineupSnapshots { get; set; }
        public DbSet<LineupSnapshotPlayer> LineupSnapshotPlayers { get; set; }
        public DbSet<WeeklyLineup> WeeklyLineups { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // ================================
            // Existing config (KEEP)
            // ================================
            modelBuilder.Entity<SeasonDraft>()
                .HasKey(d => new { d.SeasonId, d.TeamId, d.PlayerId });

            // ================================
            // Lineup Snapshots
            // ================================
            modelBuilder.Entity<LineupSnapshot>(entity =>
            {
                entity.ToTable("lineup_snapshots");

                entity.HasKey(e => e.LineupId);

                entity.Property(e => e.LineupId)
                    .HasColumnName("lineupId");

                entity.Property(e => e.SeasonId)
                    .HasColumnName("seasonId");

                entity.Property(e => e.TeamId)
                    .HasColumnName("teamId");

                entity.Property(e => e.CreatedAt)
                    .HasColumnName("createdAt");
            });

            // ================================
            // Lineup Snapshot Players
            // ================================
            modelBuilder.Entity<LineupSnapshotPlayer>(entity =>
            {
                entity.ToTable("lineup_snapshot_players");

                entity.HasKey(e => new { e.LineupId, e.PlayerId });

                entity.Property(e => e.LineupId)
                    .HasColumnName("lineupId");

                entity.Property(e => e.PlayerId)
                    .HasColumnName("playerId");

                entity.Property(e => e.Slot)
                    .HasColumnName("slot");

                entity.Property(e => e.IsCaptain)
                    .HasColumnName("isCaptain");

                entity.HasOne(e => e.LineupSnapshot)
                    .WithMany(l => l.Players)
                    .HasForeignKey(e => e.LineupId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            base.OnModelCreating(modelBuilder);
        }

    }
}