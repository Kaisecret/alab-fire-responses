import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/widgets/map_layer_tabs.dart';

void main() {
  testWidgets('incident and water source tabs switch the selected map layer', (
    tester,
  ) async {
    var selected = MapLayerMode.incidents;
    await tester.pumpWidget(
      MaterialApp(
        home: StatefulBuilder(
          builder: (context, setState) {
            return Scaffold(
              body: MapLayerTabs(
                selected: selected,
                onChanged: (mode) => setState(() => selected = mode),
              ),
            );
          },
        ),
      ),
    );

    expect(find.text('Incidents'), findsOneWidget);
    expect(find.text('Water Sources'), findsOneWidget);
    await tester.tap(find.text('Water Sources'));
    await tester.pump();
    expect(selected, MapLayerMode.waterSources);
    await tester.tap(find.text('Incidents'));
    await tester.pump();
    expect(selected, MapLayerMode.incidents);
  });
}
