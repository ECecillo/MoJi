// Package domain defines the core business types of the sinogrammes backend.
// It contains no I/O and no dependency on adapters — only pure data structures
// and rules. Cf. RFC 0003 (architecture hexagonale).
package domain

// ProgressTargetRef identifies the item being learned.
type ProgressTargetRef struct {
	Type string `json:"type"` // "character" or "word"
	ID   string `json:"id"`   // e.g., "char_4F60"
}

// SrsState represents the current Spaced Repetition System state for an item.
type SrsState struct {
	IntervalDays int     `json:"interval_days"`
	Ease         float64 `json:"ease"`
	Due          string  `json:"due"` // ISO 8601 date (YYYY-MM-DD)
}

// ProgressStats tracks the usage history of an item.
type ProgressStats struct {
	Attempts  int    `json:"attempts"`
	Successes int    `json:"successes"`
	LastSeen  string `json:"last_seen"` // ISO 8601 date (YYYY-MM-DD)
}

// ProgressEntry is the complete record of progress for a single item.
type ProgressEntry struct {
	Ref      ProgressTargetRef `json:"ref"`
	SrsState SrsState          `json:"srs_state"`
	Stats    ProgressStats     `json:"stats"`
}
