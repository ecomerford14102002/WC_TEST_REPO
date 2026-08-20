# World Cup DB — Database Schema Documentation

**Database Name:** `world_cup_db`  
**Total Tables:** 9  
**Last Updated:** August 20, 2026

---

## 📋 Table of Contents

1. [users](#users)
2. [matches](#matches)
3. [predictions](#predictions)
4. [penalty_predictions](#penalty_predictions)
5. [admin_actions](#admin_actions)
6. [comments](#comments)
7. [comment_reactions](#comment_reactions)
8. [password_reset_tokens](#password_reset_tokens)
9. [sweepstake_countries](#sweepstake_countries)

---

## 🔑 Key Relationships

```
users (1) ──→ (many) predictions
users (1) ──→ (many) penalty_predictions
users (1) ──→ (many) comments
users (1) ──→ (many) comment_reactions
users (1) ──→ (many) admin_actions
users (1) ──→ (many) password_reset_tokens

matches (1) ──→ (many) predictions
matches (1) ──→ (many) penalty_predictions
matches (1) ──→ (many) admin_actions

comments (1) ──→ (many) comment_reactions
```

---

## users

**Purpose:** Core user account table for authentication and profile management  
**Rows:** 55

| Column | Type | Nullable | Key | Extra |
|--------|------|----------|-----|-------|
| `user_id` | int | NO | PRI | auto_increment |
| `email` | varchar(255) | NO | UNI | — |
| `password_hash` | varchar(255) | YES | — | — |
| `username` | varchar(255) | YES | — | — |
| `office_location` | varchar(50) | YES | — | — |
| `sweepstake_country` | varchar(100) | YES | — | — |
| `country_guess` | varchar(100) | YES | — | — |
| `golden_glove_guess` | varchar(100) | YES | — | — |
| `golden_boot_guess` | varchar(100) | YES | — | — |
| `is_admin` | tinyint(1) | YES | — | — |
| `created_at` | timestamp | YES | — | DEFAULT_GENERATED |
| `updated_at` | timestamp | YES | — | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

**Notes:**
- `email` is unique (one account per email)
- `is_admin` flag determines admin privileges
- Stores user predictions for tournament outcomes (country, golden glove, golden boot)

---

## matches

**Purpose:** Tournament match data and results  
**Rows:** 104

| Column | Type | Nullable | Key | Extra |
|--------|------|----------|-----|-------|
| `match_id` | varchar(50) | NO | PRI | — |
| `home_team` | varchar(100) | NO | — | — |
| `away_team` | varchar(100) | NO | — | — |
| `match_date_utc` | datetime | NO | — | — |
| `home_fifa_rank` | int | YES | — | — |
| `away_fifa_rank` | int | YES | — | — |
| `status` | varchar(50) | YES | MUL | — |
| `home_score` | int | YES | — | — |
| `away_score` | int | YES | — | — |
| `penalty_winner` | varchar(100) | YES | — | — |
| `went_to_penalties` | tinyint(1) | YES | — | — |
| `created_at` | timestamp | YES | — | DEFAULT_GENERATED |
| `updated_at` | timestamp | YES | — | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| `locked_at` | timestamp | YES | — | — |
| `closed_at` | timestamp | YES | MUL | — |

**Notes:**
- `match_id` is the primary key (string identifier)
- `status` is indexed for quick filtering (e.g., "scheduled", "in_progress", "completed")
- `locked_at` marks when predictions are no longer accepted
- `closed_at` marks when match results are finalized
- `went_to_penalties` flag indicates if match went to penalty shootout

---

## predictions

**Purpose:** User predictions for match scores  
**Rows:** 3,402

| Column | Type | Nullable | Key | Extra |
|--------|------|----------|-----|-------|
| `prediction_id` | int | NO | PRI | auto_increment |
| `user_id` | int | NO | MUL | — |
| `match_id` | varchar(50) | NO | MUL | — |
| `predicted_home_score` | int | YES | — | — |
| `predicted_away_score` | int | YES | — | — |
| `points_earned` | int | YES | — | — |
| `created_at` | timestamp | YES | — | DEFAULT_GENERATED |
| `updated_at` | timestamp | YES | — | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

**Foreign Keys:**
- `user_id` → `users.user_id`
- `match_id` → `matches.match_id`

**Notes:**
- One prediction per user per match
- `points_earned` is calculated after match closes
- Indexed on `user_id` and `match_id` for fast lookups

---

## penalty_predictions

**Purpose:** User predictions for penalty shootout winners (when applicable)  
**Rows:** 3

| Column | Type | Nullable | Key | Extra |
|--------|------|----------|-----|-------|
| `penalty_prediction_id` | int | NO | PRI | auto_increment |
| `user_id` | int | NO | MUL | — |
| `match_id` | varchar(50) | NO | MUL | — |
| `predicted_winner` | varchar(100) | NO | — | — |
| `points_earned` | int | YES | — | — |
| `created_at` | timestamp | YES | — | DEFAULT_GENERATED |
| `updated_at` | timestamp | YES | — | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

**Foreign Keys:**
- `user_id` → `users.user_id`
- `match_id` → `matches.match_id`

**Notes:**
- Only populated for matches that go to penalties
- `predicted_winner` stores the team name that user predicted would win the shootout

---

## admin_actions

**Purpose:** Audit log of administrative actions on matches  
**Rows:** 106

| Column | Type | Nullable | Key | Extra |
|--------|------|----------|-----|-------|
| `action_id` | int | NO | PRI | auto_increment |
| `admin_user_id` | int | NO | MUL | — |
| `action_type` | varchar(100) | YES | — | — |
| `match_id` | varchar(50) | YES | MUL | — |
| `home_score` | int | YES | — | — |
| `away_score` | int | YES | — | — |
| `action_description` | text | YES | — | — |
| `created_at` | timestamp | YES | — | DEFAULT_GENERATED |

**Foreign Keys:**
- `admin_user_id` → `users.user_id`
- `match_id` → `matches.match_id`

**Notes:**
- Tracks all admin modifications (score updates, match corrections, etc.)
- `action_type` describes what was changed
- `action_description` provides details about the change
- Used for compliance and debugging

---

## comments

**Purpose:** User comments and interactions  
**Rows:** 25

| Column | Type | Nullable | Key | Extra |
|--------|------|----------|-----|-------|
| `id` | int | NO | PRI | auto_increment |
| `user_id` | int | NO | MUL | — |
| `target_user_id` | int | YES | MUL | — |
| `content` | varchar(500) | NO | — | — |
| `created_at` | timestamp | YES | MUL | DEFAULT_GENERATED |
| `is_deleted` | tinyint(1) | YES | — | — |

**Foreign Keys:**
- `user_id` → `users.user_id` (comment author)
- `target_user_id` → `users.user_id` (comment recipient, optional)

**Notes:**
- `target_user_id` is optional (NULL for general comments)
- `is_deleted` flag for soft deletes (preserves data integrity)
- `created_at` is indexed for sorting comments chronologically

---

## comment_reactions

**Purpose:** Reactions (likes, etc.) to comments  
**Rows:** 61

| Column | Type | Nullable | Key | Extra |
|--------|------|----------|-----|-------|
| `id` | int | NO | PRI | auto_increment |
| `comment_id` | int | NO | MUL | — |
| `user_id` | int | NO | MUL | — |
| `reaction_type` | varchar(20) | NO | — | — |
| `created_at` | timestamp | YES | — | DEFAULT_GENERATED |

**Foreign Keys:**
- `comment_id` → `comments.id`
- `user_id` → `users.user_id`

**Notes:**
- `reaction_type` stores emoji or reaction name (e.g., "like", "laugh", "fire")
- One reaction per user per comment

---

## password_reset_tokens

**Purpose:** Secure password reset token management  
**Rows:** 6

| Column | Type | Nullable | Key | Extra |
|--------|------|----------|-----|-------|
| `id` | int | NO | PRI | auto_increment |
| `user_id` | int | NO | MUL | — |
| `token` | varchar(255) | NO | UNI | — |
| `expires_at` | datetime | NO | — | — |
| `created_at` | timestamp | YES | — | DEFAULT_GENERATED |

**Foreign Keys:**
- `user_id` → `users.user_id`

**Notes:**
- `token` is unique and should be cryptographically secure
- `expires_at` determines token validity window
- Tokens are typically single-use and deleted after password reset

---

## sweepstake_countries

**Purpose:** Tournament standings and statistics by country  
**Rows:** 48

| Column | Type | Nullable | Key | Extra |
|--------|------|----------|-----|-------|
| `country_id` | int | NO | PRI | auto_increment |
| `country_name` | varchar(100) | NO | UNI | — |
| `wins` | int | YES | — | — |
| `draws` | int | YES | — | — |
| `losses` | int | YES | — | — |
| `goal_difference` | int | YES | — | — |
| `created_at` | timestamp | YES | — | DEFAULT_GENERATED |
| `updated_at` | timestamp | YES | — | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

**Notes:**
- `country_name` is unique (one record per country)
- Stores aggregate tournament statistics
- Updated after each match is finalized
- Used for leaderboards and tournament standings

---

## 📊 Data Volume Summary

| Table | Rows |
|-------|------|
| predictions | 3,402 |
| matches | 104 |
| users | 55 |
| comment_reactions | 61 |
| admin_actions | 106 |
| comments | 25 |
| password_reset_tokens | 6 |
| penalty_predictions | 3 |
| sweepstake_countries | 48 |
| **TOTAL** | **3,810** |

---

## 🔒 Security Notes

- ✅ Email addresses are unique (prevents duplicate accounts)
- ✅ Password reset tokens are unique and time-limited
- ✅ Admin actions are logged for audit trails
- ✅ Soft deletes on comments preserve referential integrity
- ⚠️ Ensure `password_hash` uses bcrypt or similar (not plaintext)
- ⚠️ Implement token expiration cleanup (cron job recommended)

---

## 🚀 Performance Considerations

**Indexed Columns:**
- `users.email` (UNI)
- `matches.status` (MUL)
- `matches.closed_at` (MUL)
- `predictions.user_id` (MUL)
- `predictions.match_id` (MUL)
- `penalty_predictions.user_id` (MUL)
- `penalty_predictions.match_id` (MUL)
- `comments.user_id` (MUL)
- `comments.target_user_id` (MUL)
- `comments.created_at` (MUL)
- `comment_reactions.comment_id` (MUL)
- `comment_reactions.user_id` (MUL)
- `admin_actions.admin_user_id` (MUL)
- `admin_actions.match_id` (MUL)
- `password_reset_tokens.user_id` (MUL)
- `sweepstake_countries.country_name` (UNI)

**Recommendations:**
- Consider adding index on `predictions.created_at` for time-based queries
- Monitor `predictions` table growth (3,402 rows already)
- Archive old password reset tokens regularly

---

## 📝 Generated

This schema documentation was auto-generated from the `world_cup_db` database on **August 20, 2026**.
