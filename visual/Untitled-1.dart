import 'package:flutter/material.dart';

void main() => runApp(IncontriApp());

class IncontriApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Incontri Premium',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.light().copyWith(
        primaryColor: Colors.deepPurple,
        colorScheme: ColorScheme.fromSwatch().copyWith(secondary: Colors.purpleAccent),
      ),
      initialRoute: '/',
      routes: {
        '/': (_) => HomeScreen(),
        '/detail': (_) => ServiceDetailScreen(),
        '/checkout': (_) => CheckoutScreen(),
      },
    );
  }
}

class Service {
  final String id;
  final String title;
  final String category;
  final int priceCents; // prezzo donna in centesimi

  Service({required this.id, required this.title, required this.category, required this.priceCents});

  double get price => priceCents / 100.0;
  String get formattedPrice => '${price.toStringAsFixed(2)} €';
}

final demoServices = [
  Service(id: 's1', title: 'Traduttrice - Sessione privata', category: 'Traduttrice', priceCents: 50000),
  Service(id: 's2', title: 'Massaggiatrice VIP - 2 ore', category: 'Massaggiatrice', priceCents: 35000),
];

class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Servizi VIP')),
      body: ListView.builder(
        padding: EdgeInsets.all(12),
        itemCount: demoServices.length,
        itemBuilder: (_, i) {
          final s = demoServices[i];
          return Card(
            margin: EdgeInsets.symmetric(vertical: 8),
            child: ListTile(
              title: Text(s.title),
              subtitle: Text('${s.category} • ${s.formattedPrice}'),
              trailing: ElevatedButton(
                child: Text('Vedi'),
                onPressed: () => Navigator.pushNamed(context, '/detail', arguments: s),
              ),
            ),
          );
        },
      ),
    );
  }
}

class ServiceDetailScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final s = ModalRoute.of(context)!.settings.arguments as Service;
    final platformFee = s.price * 0.20;
    return Scaffold(
      appBar: AppBar(title: Text(s.title)),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(s.category, style: TextStyle(fontWeight: FontWeight.w600)),
          SizedBox(height: 12),
          Text('Prezzo donna: ${s.formattedPrice}', style: TextStyle(fontSize: 16)),
          SizedBox(height: 6),
          Text('Platform fee (20%): ${platformFee.toStringAsFixed(2)} € (aggiunta al totale)', style: TextStyle(color: Colors.grey[700])),
          SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => Navigator.pushNamed(context, '/checkout', arguments: s),
            child: Text('Contatta / Acquista'),
          ),
        ]),
      ),
    );
  }
}

class CheckoutScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final s = ModalRoute.of(context)!.settings.arguments as Service;
    final price = s.price;
    final platformFee = (price * 0.20);
    final total = price + platformFee;

    return Scaffold(
      appBar: AppBar(title: Text('Checkout')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(children: [
          ListTile(title: Text('Prezzo donna'), trailing: Text('${price.toStringAsFixed(2)} €')),
          ListTile(title: Text('Platform fee (20%)'), trailing: Text('${platformFee.toStringAsFixed(2)} €')),
          Divider(),
          ListTile(title: Text('Totale da pagare'), trailing: Text('${total.toStringAsFixed(2)} €')),
          SizedBox(height: 24),
          ElevatedButton(
            onPressed: () {
              // TODO: integrare backend + Stripe. Qui simuliamo il pagamento.
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Pagamento simulato.')));
              Navigator.popUntil(context, ModalRoute.withName('/'));
            },
            child: Text('Paga ora (simulazione)'),
          )
        ]),
      ),
    );
  }
}