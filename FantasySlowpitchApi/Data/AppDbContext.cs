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


    }
}
