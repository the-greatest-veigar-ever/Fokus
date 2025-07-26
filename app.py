from flask import Flask, render_template, request, jsonify
import os

from config import Config
from models import session_manager

app = Flask(__name__)
app.config.from_object(Config)


# Routes
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/focus')
def focus():
    return render_template('focus.html')


@app.route('/dashboard')
def dashboard():
    # Get session statistics
    total_sessions = len(session_manager.sessions)
    completed_sessions = len([s for s in session_manager.sessions if s['completed']])
    total_minutes = sum(s.get('actual_duration', 0) for s in session_manager.sessions if s['completed'])

    return render_template('dashboard.html',
                           total_sessions=total_sessions,
                           completed_sessions=completed_sessions,
                           total_minutes=total_minutes,
                           recent_sessions=session_manager.sessions[-10:])


# API Routes
@app.route('/api/session/start', methods=['POST'])
def start_session():
    data = request.get_json()

    session = session_manager.start_session(
        duration=data.get('duration', 25),
        session_type=data.get('type', 'focus'),
        environment=data.get('environment', 'default')
    )

    return jsonify({
        'session_id': session['id'],
        'start_time': session['start_time'].isoformat()
    })


@app.route('/api/session/end', methods=['POST'])
def end_session():
    data = request.get_json()

    success = session_manager.end_session(
        actual_duration=data.get('actual_duration'),
        completed=data.get('completed', True)
    )

    if success:
        return jsonify({'success': True})
    else:
        return jsonify({'error': 'No active session'}), 400


@app.route('/api/audio-files')
def get_audio_files():
    """Get list of available audio files"""
    audio_dir = 'static/audio'
    audio_files = []

    if os.path.exists(audio_dir):
        for file in os.listdir(audio_dir):
            if file.endswith(('.mp3', '.wav', '.ogg')):
                audio_files.append({
                    'name': file.replace('.mp3', '').replace('-', ' ').title(),
                    'file': file
                })

    return jsonify(audio_files)


@app.route('/api/backgrounds')
def get_backgrounds():
    """Get list of available background images"""
    bg_dir = 'static/images/backgrounds'
    backgrounds = []

    if os.path.exists(bg_dir):
        for file in os.listdir(bg_dir):
            if file.endswith(('.jpg', '.jpeg', '.png')):
                backgrounds.append({
                    'name': file.replace('.jpg', '').replace('-', ' ').title(),
                    'file': file
                })

    return jsonify(backgrounds)


@app.route('/api/stats')
def get_stats():
    """Get session statistics"""
    sessions = session_manager.sessions
    completed = [s for s in sessions if s['completed']]

    # Calculate daily stats for the last 7 days
    from datetime import datetime, timedelta
    today = datetime.now().date()
    daily_stats = []

    for i in range(7):
        date = today - timedelta(days=i)
        day_sessions = [s for s in completed
                        if s['start_time'].date() == date]
        daily_stats.append({
            'date': date.isoformat(),
            'sessions': len(day_sessions),
            'minutes': sum(s.get('actual_duration', 0) for s in day_sessions)
        })

    return jsonify({
        'total_sessions': len(sessions),
        'completed_sessions': len(completed),
        'total_minutes': sum(s.get('actual_duration', 0) for s in completed),
        'daily_stats': daily_stats[::-1]  # Reverse to show oldest first
    })


if __name__ == '__main__':
    app.run(debug=True)