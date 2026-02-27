-- Multi-Judge Panel: store individual judge scores for each match
-- judge_scores is a JSONB array of judge votes:
-- [{ "judgeId": "odin", "judgeName": "ODIN", "model": "llama-3.3-70b-versatile",
--    "scoreA": 85, "scoreB": 72, "winnerId": "A", "reasoning": "...", "failed": false }]

ALTER TABLE matches ADD COLUMN IF NOT EXISTS judge_scores JSONB DEFAULT '[]'::jsonb;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_split_decision BOOLEAN DEFAULT false;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_unanimous BOOLEAN DEFAULT false;

COMMENT ON COLUMN matches.judge_scores IS 'Array of individual judge votes from the multi-judge panel';
COMMENT ON COLUMN matches.is_split_decision IS 'True when judges disagreed on the winner';
COMMENT ON COLUMN matches.is_unanimous IS 'True when all judges agreed on the winner';
