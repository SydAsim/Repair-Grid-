import os
import json
import boto3

dynamodb = boto3.resource('dynamodb')
connections_table_name = os.getenv('CONNECTIONS_TABLE', 'RepairGridConnections')
connections_table = dynamodb.Table(connections_table_name)
ws_endpoint = os.getenv('WS_ENDPOINT')

def handle_stream(event, context):
    """
    DynamoDB Streams consumer that broadcasts live mission and report updates to all active WebSocket clients.
    """
    records = event.get('Records', [])
    if not records:
        return {'statusCode': 200, 'message': 'No records'}

    endpoint = ws_endpoint.replace('wss://', 'https://') if ws_endpoint else None
    apigw_client = boto3.client('apigatewaymanagementapi', endpoint_url=endpoint) if endpoint else None

    # Get active connection IDs
    try:
        scan_result = connections_table.scan(ProjectionExpression='connectionId')
        connection_ids = [item['connectionId'] for item in scan_result.get('Items', [])]
    except Exception as e:
        print(f"Error reading connections table: {e}")
        return {'statusCode': 500, 'error': str(e)}

    for record in records:
        payload = {
            'type': 'DYNAMODB_STREAM_EVENT',
            'eventName': record.get('eventName'),
            'eventSourceARN': record.get('eventSourceARN'),
            'dynamodb': record.get('dynamodb')
        }
        data = json.dumps(payload, default=str).encode('utf-8')

        if apigw_client:
            for cid in connection_ids:
                try:
                    apigw_client.post_to_connection(
                        ConnectionId=cid,
                        Data=data
                    )
                except Exception as err:
                    err_str = str(err)
                    if 'GoneException' in err_str or '410' in err_str:
                        try:
                            connections_table.delete_item(Key={'connectionId': cid})
                        except Exception:
                            pass

    return {'statusCode': 200, 'broadcast_count': len(connection_ids)}
