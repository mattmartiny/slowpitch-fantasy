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


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<SeasonDraft>()
                .HasKey(d => new { d.SeasonId, d.TeamId, d.PlayerId });

            base.OnModelCreating(modelBuilder);
        }
    }
}
