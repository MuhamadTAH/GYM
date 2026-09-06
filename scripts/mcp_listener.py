import sqlite3
import time
import json
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "gym.db")

def wait_for_athlete_message():
    print(f"=== MCP PYTHON LISTENER ACTIVE ===", flush=True)
    print(f"Listening on {DB_PATH} for athlete messages...", flush=True)
    
    while True:
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Check for pending athlete message
            cursor.execute(
                "SELECT id, user_id, content, created_at FROM coach_messages WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1"
            )
            msg = cursor.fetchone()
            
            if msg:
                msg_id = msg["id"]
                user_id = msg["user_id"]
                content = msg["content"]
                created_at = msg["created_at"]
                
                # Fetch athlete profile
                cursor.execute(
                    "SELECT name, baseline_lifts, preferred_unit, current_weight_value FROM user_profiles WHERE id = ? LIMIT 1",
                    (user_id,)
                )
                user = cursor.fetchone()
                athlete_name = user["name"] if user else "Athlete"
                unit = user["preferred_unit"] if user else "kg"
                baselines = user["baseline_lifts"] if user else "{}"
                
                # Fetch active workout session
                cursor.execute(
                    "SELECT session_name, week_number, day_index, status FROM workout_sessions WHERE is_completed = 0 AND status != 'aborted' ORDER BY scheduled_date ASC LIMIT 1"
                )
                session = cursor.fetchone()
                session_name = session["session_name"] if session else "General Training"
                
                print("\n" + "=" * 64, flush=True)
                print(f"🔔 NEW ATHLETE MESSAGE RECEIVED FROM DASHBOARD OVER MCP", flush=True)
                print("=" * 64, flush=True)
                print(f"MESSAGE ID : {msg_id}", flush=True)
                print(f"ATHLETE    : {athlete_name}", flush=True)
                print(f"CONTENT    : \"{content}\"", flush=True)
                print(f"TIMESTAMP  : {created_at}", flush=True)
                print("\n[ACTIVE ATHLETE CONTEXT]", flush=True)
                print(f"Workout    : {session_name}", flush=True)
                print(f"1RM Baselines: {baselines} ({unit})", flush=True)
                print("=" * 64, flush=True)
                print(f"INSTRUCTION FOR ANTIGRAVITY AI:", flush=True)
                print(f"1. Formulate a genuine, intelligent, personal AI Coach response to this athlete message.", flush=True)
                print(f"2. Execute: pnpm exec tsx scripts/reply-athlete.ts \"{msg_id}\" \"<YOUR_FRESH_AI_RESPONSE>\"", flush=True)
                print(f"3. Immediately relaunch python scripts/mcp_listener.py as a background task.", flush=True)
                print("=" * 64 + "\n", flush=True)
                
                conn.close()
                sys.exit(0) # Exit to trigger reactive wake-up in Antigravity!
                
            conn.close()
        except Exception as e:
            print(f"[Listener Warning]: {e}", flush=True)
            
        time.sleep(0.5)

if __name__ == "__main__":
    wait_for_athlete_message()
