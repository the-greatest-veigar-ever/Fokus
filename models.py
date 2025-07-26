# Simple data structures for the focus app
# No database needed - just in-memory storage

class SessionData:
    def __init__(self):
        self.sessions = []
        self.current_session = None

    def start_session(self, duration, session_type='focus', environment='default'):
        from datetime import datetime
        session = {
            'id': len(self.sessions) + 1,
            'start_time': datetime.now(),
            'planned_duration': duration,
            'session_type': session_type,
            'environment': environment,
            'completed': False
        }
        self.current_session = session
        return session

    def end_session(self, actual_duration, completed=True):
        if self.current_session:
            from datetime import datetime
            self.current_session.update({
                'end_time': datetime.now(),
                'actual_duration': actual_duration,
                'completed': completed
            })
            self.sessions.append(self.current_session)
            self.current_session = None
            return True
        return False


# Global session manager
session_manager = SessionData()