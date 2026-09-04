using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Scaffolding.Internal;

namespace backend.Models;

public partial class WorkHubContext : DbContext
{
    public WorkHubContext()
    {
    }

    public WorkHubContext(DbContextOptions<WorkHubContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Application> Applications { get; set; }

    public virtual DbSet<Employerprofile> Employerprofiles { get; set; }

    public virtual DbSet<Finderprofile> Finderprofiles { get; set; }

    public virtual DbSet<Job> Jobs { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .UseCollation("utf8mb4_unicode_ci")
            .HasCharSet("utf8mb4");

        modelBuilder.Entity<Application>(entity =>
        {
            entity.HasKey(e => e.ApplicationId).HasName("PRIMARY");

            entity.ToTable("application");

            entity.HasIndex(e => new { e.FinderId, e.JobId }, "finderId").IsUnique();

            entity.HasIndex(e => e.JobId, "fk_application_job");

            entity.Property(e => e.ApplicationId)
                .HasMaxLength(36)
                .HasColumnName("applicationId");
            entity.Property(e => e.AppliedAt)
                .HasColumnType("datetime")
                .HasColumnName("appliedAt");
            entity.Property(e => e.CoverLetter)
                .HasColumnType("text")
                .HasColumnName("coverLetter");
            entity.Property(e => e.FinderId)
                .HasMaxLength(36)
                .HasColumnName("finderId");
            entity.Property(e => e.JobId)
                .HasMaxLength(36)
                .HasColumnName("jobId");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");

            entity.HasOne(d => d.Finder).WithMany(p => p.Applications)
                .HasForeignKey(d => d.FinderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_application_finder");

            entity.HasOne(d => d.Job).WithMany(p => p.Applications)
                .HasForeignKey(d => d.JobId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_application_job");
        });

        modelBuilder.Entity<Employerprofile>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PRIMARY");

            entity.ToTable("employerprofile");

            entity.HasIndex(e => e.CompanyName, "companyName").IsUnique();

            entity.Property(e => e.UserId)
                .HasMaxLength(36)
                .HasColumnName("userId");
            entity.Property(e => e.Address)
                .HasMaxLength(255)
                .HasColumnName("address");
            entity.Property(e => e.CompanyName)
                .HasMaxLength(100)
                .HasColumnName("companyName");
            entity.Property(e => e.Description)
                .HasColumnType("text")
                .HasColumnName("description");
            entity.Property(e => e.Field)
                .HasMaxLength(50)
                .HasColumnName("field");
            entity.Property(e => e.FoundedYear).HasColumnName("foundedYear");
            entity.Property(e => e.Logo)
                .HasMaxLength(255)
                .HasColumnName("logo");
            entity.Property(e => e.Phone)
                .HasMaxLength(15)
                .HasColumnName("phone");
            entity.Property(e => e.TaxCode)
                .HasMaxLength(15)
                .HasColumnName("taxCode");
            entity.Property(e => e.Website)
                .HasMaxLength(255)
                .HasColumnName("website");

            entity.HasOne(d => d.User).WithOne(p => p.Employerprofile)
                .HasForeignKey<Employerprofile>(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("employerId");
        });

        modelBuilder.Entity<Finderprofile>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PRIMARY");

            entity.ToTable("finderprofile");

            entity.Property(e => e.UserId)
                .HasMaxLength(36)
                .HasColumnName("userId");
            entity.Property(e => e.Address)
                .HasMaxLength(255)
                .HasColumnName("address");
            entity.Property(e => e.Avatar)
                .HasMaxLength(255)
                .HasColumnName("avatar");
            entity.Property(e => e.Cv)
                .HasMaxLength(255)
                .HasColumnName("CV");
            entity.Property(e => e.Description)
                .HasColumnType("text")
                .HasColumnName("description");
            entity.Property(e => e.EducationLevel)
                .HasMaxLength(30)
                .HasColumnName("educationLevel");
            entity.Property(e => e.Experience)
                .HasColumnType("text")
                .HasColumnName("experience");
            entity.Property(e => e.Fullname)
                .HasMaxLength(100)
                .HasColumnName("fullname");
            entity.Property(e => e.LinkedIn).HasMaxLength(255);
            entity.Property(e => e.Major).HasMaxLength(50);
            entity.Property(e => e.Phone)
                .HasMaxLength(15)
                .HasColumnName("phone");
            entity.Property(e => e.Skill)
                .HasColumnType("text")
                .HasColumnName("skill");

            entity.HasOne(d => d.User).WithOne(p => p.Finderprofile)
                .HasForeignKey<Finderprofile>(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("finderId");
        });

        modelBuilder.Entity<Job>(entity =>
        {
            entity.HasKey(e => e.JobId).HasName("PRIMARY");

            entity.ToTable("job");

            entity.HasIndex(e => e.EmployerId, "fk_job_employer");

            entity.Property(e => e.JobId)
                .HasMaxLength(36)
                .HasColumnName("jobId");
            entity.Property(e => e.ApplicantBenefit)
                .HasColumnType("text")
                .HasColumnName("applicantBenefit");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("datetime")
                .HasColumnName("createdAt");
            entity.Property(e => e.Deadline)
                .HasColumnType("datetime")
                .HasColumnName("deadline");
            entity.Property(e => e.Description)
                .HasColumnType("text")
                .HasColumnName("description");
            entity.Property(e => e.EmployerId)
                .HasMaxLength(36)
                .HasColumnName("employerId");
            entity.Property(e => e.IsNegotiable)
                .HasColumnType("bit(1)")
                .HasColumnName("isNegotiable");
            entity.Property(e => e.JobTitle)
                .HasMaxLength(255)
                .HasColumnName("jobTitle");
            entity.Property(e => e.Location)
                .HasMaxLength(255)
                .HasColumnName("location");
            entity.Property(e => e.NumberOfPosition).HasColumnName("numberOfPosition");
            entity.Property(e => e.Requirement)
                .HasColumnType("text")
                .HasColumnName("requirement");
            entity.Property(e => e.Salary).HasColumnName("salary");
            entity.Property(e => e.SkillRequired)
                .HasMaxLength(255)
                .HasColumnName("skillRequired");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.WorkType)
                .HasMaxLength(20)
                .HasColumnName("workType");

            entity.HasOne(d => d.Employer).WithMany(p => p.Jobs)
                .HasForeignKey(d => d.EmployerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_job_employer");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PRIMARY");

            entity.ToTable("users");

            entity.HasIndex(e => e.Email, "email").IsUnique();

            entity.Property(e => e.UserId)
                .HasMaxLength(36)
                .HasColumnName("userId");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasColumnName("passwordHash");
            entity.Property(e => e.Role)
                .HasMaxLength(20)
                .HasColumnName("role");
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .HasColumnName("username");
            entity.Property(e => e.Email)
            .HasMaxLength(100)
            .HasColumnName("email");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
