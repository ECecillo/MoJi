-- +goose Up
CREATE TABLE progress (
    target_type TEXT NOT NULL,
    target_id   TEXT NOT NULL,
    interval_days INTEGER NOT NULL,
    ease        REAL NOT NULL,
    due         TEXT NOT NULL,
    attempts    INTEGER NOT NULL,
    successes   INTEGER NOT NULL,
    last_seen   TEXT NOT NULL,
    PRIMARY KEY (target_type, target_id)
);

-- +goose Down
DROP TABLE progress;
