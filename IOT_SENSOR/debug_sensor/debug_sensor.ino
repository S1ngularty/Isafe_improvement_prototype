// SR04M-2 Deep Diagnostic
// Tests UART idle voltage, baud scan, and TRIG/ECHO pulse mode.

#define RX_PIN 26
#define TX_PIN 27

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println(F("\n========== SR04M-2 Deep Diag =========="));

  // --- Step 1: Check sensor pin labels ---
  Serial.println(F("STEP 0: What pins does your sensor have?"));
  Serial.println(F("  Reply with:"));
  Serial.println(F("    uart - if it has TX/RX labels"));
  Serial.println(F("    trig - if it has TRIG/ECHO labels"));
  Serial.println(F("    both - if it has both sets"));
  Serial.println(F("    ao   - if it has an AO label"));
  Serial.println();

  // --- Step 2: Measure idle voltage on RX pin ---
  Serial.println(F("STEP 1: Checking RX pin state (no UART)..."));
  pinMode(RX_PIN, INPUT);
  delay(100);

  int highCount = 0;
  for (int i = 0; i < 100; i++) {
    if (digitalRead(RX_PIN) == HIGH) highCount++;
    delay(10);
  }

  Serial.print(F("  GPIO26 sampled 100x: "));
  Serial.print(highCount);
  Serial.println(F("% HIGH"));
  if (highCount < 5) {
    Serial.println(F("  -> Line is pulled LOW (likely pulldown resistor or sensor off)"));
  } else if (highCount > 95) {
    Serial.println(F("  -> Line is pulled HIGH (sensor idle, UART idle state)"));
  } else {
    Serial.println(F("  -> Line is floating or noisy"));
  }
  Serial.println();

  // --- Step 3: UART listen at all common bauds ---
  Serial.println(F("STEP 2: UART scan - listening 3s at each baud..."));

  long rates[] = {2400, 4800, 9600, 14400, 19200, 38400, 57600, 115200};
  int numRates = 8;

  for (int r = 0; r < numRates; r++) {
    Serial2.end();
    delay(50);
    Serial2.begin(rates[r], SERIAL_8N1, RX_PIN, TX_PIN);

    int total = 0;
    unsigned long start = millis();
    while (millis() - start < 3000) {
      while (Serial2.available()) {
        uint8_t b = Serial2.read();
        total++;
        if (total <= 10) {
          Serial.print(F("    ["));
          Serial.print(b, HEX);
          Serial.print(F("]"));
        }
      }
    }

    Serial.print(F("\n  "));
    Serial.print(rates[r]);
    Serial.print(F(" baud: "));
    Serial.print(total);
    Serial.println(F(" bytes"));
  }

  // --- Step 4: Trigger-like pulse on TX pin ---
  Serial.println();
  Serial.println(F("STEP 3: Sending 10us HIGH pulse (TRIG mode test)..."));
  Serial2.end();
  pinMode(TX_PIN, OUTPUT);
  digitalWrite(TX_PIN, LOW);
  delay(100);

  // Send a 10us HIGH pulse (standard HC-SR04 trigger)
  digitalWrite(TX_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TX_PIN, LOW);

  // Listen for echo on RX pin (pulse timing)
  pinMode(RX_PIN, INPUT);
  unsigned long pulseLen = pulseIn(RX_PIN, HIGH, 30000); // 30ms timeout = ~5m

  if (pulseLen > 0) {
    float distance = pulseLen / 58.0f; // HC-SR04 formula: cm = us / 58
    Serial.print(F("  Echo pulse received: "));
    Serial.print(pulseLen);
    Serial.print(F(" us = ~"));
    Serial.print(distance);
    Serial.println(F(" cm"));
    Serial.println(F("  -> Sensor works in TRIG/ECHO mode!"));
  } else {
    Serial.println(F("  No echo pulse detected"));
    Serial.println(F("  -> Sensor may not support TRIG/ECHO, or not powered"));
  }

  Serial.println();
  Serial.println(F("========================================"));
  Serial.println(F("Try: connect sensor to a USB-TTL adapter"));
  Serial.println(F("(3.3V) at 9600 baud to confirm it transmits."));
  Serial.println(F("========================================"));

  // Re-init UART for potential further use
  pinMode(TX_PIN, OUTPUT);
  pinMode(RX_PIN, INPUT);
  Serial2.begin(9600, SERIAL_8N1, RX_PIN, TX_PIN);
}

void loop() {
  // Live monitor - show any incoming bytes
  static unsigned long lastPrint = 0;
  static int byteCount = 0;

  while (Serial2.available()) {
    uint8_t b = Serial2.read();
    byteCount++;
    if (byteCount <= 20) {
      Serial.print(b, HEX);
      Serial.print(" ");
    }
  }

  if (millis() - lastPrint > 5000 && byteCount > 0) {
    Serial.print(F("\n[Total: "));
    Serial.print(byteCount);
    Serial.println(F(" bytes since boot]"));
    lastPrint = millis();
  }

  if (Serial.available()) {
    char c = Serial.read();
    if (c == 't') {
      Serial.println(F("\nSending 0x55 trigger..."));
      Serial2.write(0x55);
    }
    if (c == 'p') {
      Serial.println(F("\nSending 10us TRIG pulse..."));
      Serial2.end();
      pinMode(TX_PIN, OUTPUT);
      digitalWrite(TX_PIN, LOW);
      delay(10);
      digitalWrite(TX_PIN, HIGH);
      delayMicroseconds(10);
      digitalWrite(TX_PIN, LOW);
      pinMode(RX_PIN, INPUT);
      unsigned long pl = pulseIn(RX_PIN, HIGH, 30000);
      if (pl > 0) {
        Serial.print(F("Echo: "));
        Serial.print(pl / 58.0f);
        Serial.println(F(" cm"));
      } else {
        Serial.println(F("No echo"));
      }
      Serial2.begin(9600, SERIAL_8N1, RX_PIN, TX_PIN);
    }
  }
}
