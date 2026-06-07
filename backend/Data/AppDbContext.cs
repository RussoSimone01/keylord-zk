using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data
{
    public class AppDbContext(DbContextOptions<AppDbContext> dbContextOptions) : DbContext(dbContextOptions)
    {
        public DbSet<User> Users { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<Credential> Credentials { get; set; }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var entries = ChangeTracker.Entries()
                .Where(e => e.State == EntityState.Modified);

            foreach (var entry in entries)
            {
                if (entry.Entity is User u) u.UpdatedAt = DateTime.UtcNow;
                if (entry.Entity is Credential c) c.UpdatedAt = DateTime.UtcNow;
            }

            return base.SaveChangesAsync(cancellationToken);
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>(entity =>
            {
                entity.Property(u => u.Username).HasMaxLength(50).IsRequired();
                entity.Property(u => u.Email).HasMaxLength(255);
                entity.Property(u => u.AuthKeyHash).IsRequired();
                entity.Property(u => u.KdfSalt).HasMaxLength(64).IsRequired();
                entity.HasIndex(u => u.Username).IsUnique();
                entity.HasIndex(u => u.Email).IsUnique();
            });

            modelBuilder.Entity<Credential>(entity =>
            {
                entity.Property(c => c.EncryptedData).IsRequired();
            });

            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.Property(r => r.TokenHash).HasMaxLength(64).IsRequired();
                entity.HasIndex(r => r.TokenHash).IsUnique();
            });
        }
    }
}