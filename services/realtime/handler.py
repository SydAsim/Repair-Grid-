import os
import json
import time
import boto3

dynamodb = boto3.resource('dynamodb')
connections_table_name = os.getenv('CONNECTIONS_TABLE', 'RepairGridConnections')
connections_table = dynamodb.Table(connections_table_name)

def handle_ws(event, context):
    """
    Handles WebSocket $connect, $disconnect, and default routes.
    """
    request_context = event.get('requestContext', {})
    route_key = request_context.get('routeKey', '$default')
    connection_id = request_context.get('connectionId')

    if not connection_id:
        return {'statusCode': 400, 'body': 'Missing connectionId'}

    if route_key == '$connect':
        # Add connection with 2-hour TTL
        ttl = int(time.time()) + 7200
        connections_table.put_item(
            Item={
                'connectionId': connection_id,
                'connectedAt': int(time.time()),
                'ttl': ttl
            }
        )
        return {'statusCode': 200, 'body': 'Connected'}

    elif route_key == '$disconnect':
        try:
            connections_table.delete_item(Key={'connectionId': connection_id})
        except Exception:
            pass
        return {'statusCode': 200, 'body': 'Disconnected'}

    elif route_key == 'ping':
        return {'statusCode': 200, 'body': 'pong'}

    return {'statusCode': 200, 'body': json.dumps({'message': 'Ack', 'route': route_key})}
