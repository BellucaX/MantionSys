#!/usr/bin/env python3
"""
Mock Admin API Server for quick testing of admin dashboard
Provides /api/admin/login and /api/admin/dashboard endpoints
Run: python3 mock_admin_server.py
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.parse
from datetime import datetime, timedelta
import uuid

# In-memory storage (starts empty)
bookings = []
next_booking_id = 1

class MockAdminHandler(BaseHTTPRequestHandler):
    """Mock admin endpoints with CORS support"""

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/api/admin/login':
            self.handle_admin_login()
        elif self.path == '/api/bookings':
            self.handle_create_booking()
        else:
            self.send_response(404)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Not Found'}).encode())

    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/api/admin/dashboard':
            self.handle_admin_dashboard()
        else:
            self.send_response(404)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Not Found'}).encode())

    def do_PATCH(self):
        """Handle PATCH requests for check-in/check-out"""
        # Mock check-in/check-out endpoints
        if '/api/bookings/' in self.path and ('/check-in' in self.path or '/check-out' in self.path):
            self.handle_booking_action()
        else:
            self.send_response(404)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Not Found'}).encode())

    def handle_admin_login(self):
        """Handle admin login endpoint"""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        try:
            data = json.loads(body)
            passcode = data.get('passcode', '')
            
            if passcode == 'admin1234':
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                self.end_headers()
                
                response = {
                    'data': {
                        'token': 'mock_admin_token_' + str(uuid.uuid4()),
                        'role': 'admin',
                        'name': 'Administrator'
                    }
                }
                self.wfile.write(json.dumps(response).encode())
            else:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    'error': 'Unauthorized',
                    'message': 'Invalid admin passcode'
                }
                self.wfile.write(json.dumps(response).encode())
        except json.JSONDecodeError:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {'error': 'Bad Request', 'message': 'Invalid JSON'}
            self.wfile.write(json.dumps(response).encode())

    def handle_admin_dashboard(self):
        """Handle admin dashboard endpoint"""
        # Check authorization
        auth_header = self.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {'error': 'Unauthorized', 'message': 'Missing bearer token'}
            self.wfile.write(json.dumps(response).encode())
            return

        today = datetime.now().strftime('%Y-%m-%d')
        
        # Mock room list (empty bookings)
        rooms = [
            {'id': 1, 'roomNumber': '101', 'type': 'standard', 'status': 'available', 'maxGuests': 2},
            {'id': 2, 'roomNumber': '102', 'type': 'deluxe', 'status': 'available', 'maxGuests': 2},
            {'id': 3, 'roomNumber': '201', 'type': 'family', 'status': 'available', 'maxGuests': 4},
        ]
        
        # Filter bookings for today
        arrivals_today = [b for b in bookings if b['status'] == 'reserved' and b['checkInDate'] == today]
        departures_today = [b for b in bookings if b['status'] == 'checked_in' and b['checkOutDate'] == today]
        
        # Build room overview
        room_overview = []
        for room in rooms:
            current_booking = next((b for b in bookings if b['roomId'] == room['id'] and b['status'] in ['reserved', 'checked_in']), None)
            room_overview.append({
                'id': room['id'],
                'roomNumber': room['roomNumber'],
                'type': room['type'],
                'roomStatus': room['status'],
                'hasIncomingToday': any(b['roomId'] == room['id'] and b['checkInDate'] == today for b in arrivals_today),
                'hasOutgoingToday': any(b['roomId'] == room['id'] and b['checkOutDate'] == today for b in departures_today),
                'currentBooking': current_booking if current_booking else None,
                'hold': None
            })
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

        dashboard_data = {
            'data': {
                'date': today,
                'summary': {
                    'totalRooms': len(rooms),
                    'availableRooms': len([r for r in rooms if r['status'] == 'available']),
                    'occupiedRooms': len([r for r in rooms if r['status'] == 'occupied']),
                    'maintenanceRooms': len([r for r in rooms if r['status'] == 'maintenance']),
                    'activeBookings': len([b for b in bookings if b['status'] in ['reserved', 'checked_in']]),
                    'arrivalsToday': len(arrivals_today),
                    'departuresToday': len(departures_today),
                    'waitingCheckIn': len([b for b in bookings if b['status'] == 'reserved' and b['checkInDate'] <= today]),
                    'waitingCheckOut': len([b for b in bookings if b['status'] == 'checked_in' and b['checkOutDate'] <= today]),
                },
                'arrivalsToday': arrivals_today,
                'departuresToday': departures_today,
                'waitingCheckIn': [b for b in bookings if b['status'] == 'reserved' and b['checkInDate'] <= today],
                'waitingCheckOut': [b for b in bookings if b['status'] == 'checked_in' and b['checkOutDate'] <= today],
                'roomOverview': room_overview
            }
        }

        self.wfile.write(json.dumps(dashboard_data).encode())

    def handle_create_booking(self):
        """Handle create booking endpoint"""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        try:
            data = json.loads(body)
            global next_booking_id
            
            booking = {
                'id': next_booking_id,
                'roomId': data.get('roomId'),
                'guestName': data.get('guestName'),
                'guestPhone': data.get('guestPhone', ''),
                'checkInDate': data.get('checkInDate'),
                'checkOutDate': data.get('checkOutDate'),
                'guestCount': data.get('guestCount'),
                'status': 'reserved',
                'createdAt': datetime.now().isoformat()
            }
            
            bookings.append(booking)
            next_booking_id += 1
            
            self.send_response(201)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {'data': booking}
            self.wfile.write(json.dumps(response).encode())
        except (json.JSONDecodeError, ValueError) as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {'error': 'Bad Request', 'message': str(e)}
            self.wfile.write(json.dumps(response).encode())

    def handle_booking_action(self):
        """Handle check-in/check-out actions"""
        # Extract booking ID and action
        parts = self.path.split('/')
        try:
            booking_id = int(parts[3])
        except (IndexError, ValueError):
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Invalid booking ID'}).encode())
            return
        
        action = 'check-in' if 'check-in' in self.path else 'check-out'
        
        # Find booking
        booking = next((b for b in bookings if b['id'] == booking_id), None)
        if not booking:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Booking not found'}).encode())
            return
        
        # Update status
        if action == 'check-in':
            booking['status'] = 'checked_in'
            booking['checkedInAt'] = datetime.now().isoformat()
        else:
            booking['status'] = 'checked_out'
            booking['checkedOutAt'] = datetime.now().isoformat()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response = {'data': booking}
        self.wfile.write(json.dumps(response).encode())

    def log_message(self, format, *args):
        """Suppress default HTTP logging"""
        print(f"[{self.log_date_time_string()}] {format % args}")


def run_mock_server(port=5000):
    """Start the mock server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, MockAdminHandler)
    print(f"Mock Admin API Server running on http://localhost:{port}")
    print(f"Admin login: POST http://localhost:{port}/api/admin/login")
    print(f"  - passcode: admin1234")
    print(f"Admin dashboard: GET http://localhost:{port}/api/admin/dashboard")
    print(f"Press Ctrl+C to stop")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
        httpd.server_close()


if __name__ == '__main__':
    run_mock_server()
