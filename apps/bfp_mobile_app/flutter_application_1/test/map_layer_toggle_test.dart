import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/widgets/map_layer_toggle.dart';

void main() {
  testWidgets('layer toggle switches between incidents and water sources', (
    tester,
  ) async {
    var selected = MapLayerMode.incidents;
    await tester.pumpWidget(
      MaterialApp(
        home: StatefulBuilder(
          builder: (context, setState) {
            return Scaffold(
              body: MapLayerToggleButton(
                selected: selected,
                onChanged: (mode) => setState(() => selected = mode),
              ),
            );
          },
        ),
      ),
    );

    expect(find.byTooltip('Show water sources'), findsOneWidget);
    expect(find.byIcon(Icons.water_drop_rounded), findsOneWidget);
    await tester.tap(find.byType(MapLayerToggleButton));
    await tester.pump();
    expect(selected, MapLayerMode.waterSources);

    expect(find.byTooltip('Show incidents'), findsOneWidget);
    expect(find.byIcon(Icons.local_fire_department_rounded), findsOneWidget);
    await tester.tap(find.byType(MapLayerToggleButton));
    await tester.pump();
    expect(selected, MapLayerMode.incidents);
  });
}
