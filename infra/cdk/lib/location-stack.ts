import * as cdk from 'aws-cdk-lib';
import * as location from 'aws-cdk-lib/aws-location';
import { Construct } from 'constructs';

export class RepairGridLocationStack extends cdk.Stack {
  public readonly map: location.CfnMap;
  public readonly placeIndex: location.CfnPlaceIndex;
  public readonly routeCalculator: location.CfnRouteCalculator;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Amazon Location Map
    this.map = new location.CfnMap(this, 'CampusMap', {
      mapName: 'RepairGridCampusMap',
      configuration: {
        style: 'VectorEsriNavigation',
      },
      description: 'RepairGrid Campus District Living Map',
    });

    // 2. Place Index for reverse geocoding
    this.placeIndex = new location.CfnPlaceIndex(this, 'PlaceIndex', {
      indexName: 'RepairGridPlaceIndex',
      dataSource: 'Esri',
      description: 'RepairGrid Reverse Geocoding Index',
    });

    // 3. Route Calculator for worker dispatch routes
    this.routeCalculator = new location.CfnRouteCalculator(this, 'RouteCalculator', {
      calculatorName: 'RepairGridRouteCalculator',
      dataSource: 'Esri',
      description: 'RepairGrid Route Optimizer for Field Technicians',
    });

    new cdk.CfnOutput(this, 'MapName', { value: this.map.mapName });
    new cdk.CfnOutput(this, 'PlaceIndexName', { value: this.placeIndex.indexName });
    new cdk.CfnOutput(this, 'RouteCalculatorName', { value: this.routeCalculator.calculatorName });
  }
}
