// SR04M-2 Debug Sketch v2
// Listens at 9600 baud (default SR04M-2), shows raw HEX dump every 2s.
// No secrets.h needed.

#define RX_PIN 26
#define TX_PIN 27

uint8_t rawBuffer[256];
int rawIndex = 0;
unsigned long lastDump = 0;

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println(F("\n========== SR04M-2 Debug v2 =========="));
  Serial.print(F("GPIO26 (RX) <- SR04M-2 TX  (9600 8N1)"));
  Serial.println();
  Serial.print(F("GPIO27 (TX) -> SR04M-2 RX"));
  Serial.println();
  Serial.println();
  Serial.println(F("Every 2s: raw HEX dump of received bytes"));
  Serial.println(F("Commands:"));
  Serial.println(F("  t   send 0x55 trigger"));
  Serial.println(F("  0x  send custom hex byte(s), e.g. type: 55"));
  Serial.println(F("  f   flush buffer"));
  Serial.println(F("  c   clear raw buffer (reset display)"));
  Serial.println(F("========================================\n"));

  Serial2.begin(9600, SERIAL_8N1, RX_PIN, TX_PIN);
  delay(300);
  while (Serial2.available()) Serial2.read();
}

void loop() {
  handleSerialInput();
  collectBytes();

  if (millis() - lastDump > 2000) {
    lastDump = millis();
    dumpRawBuffer();
  }
}

void collectBytes() {
  while (Serial2.available() && rawIndex < 256) {
    rawBuffer[rawIndex++] = Serial2.read();
  }
}

void dumpRawBuffer() {
  if (rawIndex == 0) {
    Serial.println(F("[no data received]"));
    return;
  }

  Serial.println();
  Serial.print(F("--- "));
  Serial.print(rawIndex);
  Serial.println(F(" bytes received ---"));

  // Print as HEX
  for (int i = 0; i < rawIndex; i++) {
    if (i > 0 && i % 16 == 0) Serial.println();
    if (rawBuffer[i] < 0x10) Serial.print('0');
    Serial.print(rawBuffer[i], HEX);
    Serial.print(' ');
  }
  Serial.println();

  // Try to find 0xFF-prefixed 4-byte frames
  int framesFound = 0;
  for (int i = 0; i <= rawIndex - 4; i++) {
    if (rawBuffer[i] == 0xFF) {
      uint16_t dist = (rawBuffer[i + 1] << 8) | rawBuffer[i + 2];
      uint8_t sum = (rawBuffer[i] + rawBuffer[i + 1] + rawBuffer[i + 2]) & 0xFF;
      bool checksumOK = (sum == rawBuffer[i + 3]);

      Serial.print(F("  Frame at offset "));
      Serial.print(i);
      Serial.print(F(": FF "));
      Serial.print(rawBuffer[i + 1], HEX);
      Serial.print(' ');
      Serial.print(rawBuffer[i + 2], HEX);
      Serial.print(' ');
      Serial.print(rawBuffer[i + 3], HEX);
      Serial.print(F("  dist="));
      Serial.print(dist);
      Serial.print(F("mm  chk="));
      Serial.println(checksumOK ? F("OK") : F("FAIL"));
      framesFound++;
    }
  }

  if (framesFound == 0 && rawIndex >= 4) {
    Serial.println(F("  No FF-prefixed frames found"));
  }

  rawIndex = 0;
}

void handleSerialInput() {
  if (!Serial.available()) return;

  String cmd = Serial.readStringUntil('\n');
  cmd.trim();

  if (cmd == "t") {
    Serial.println(F(">> Sending 0x55 trigger..."));
    Serial2.write(0x55);
    flushSerial2();
  } else if (cmd == "f") {
    flushSerial2();
  } else if (cmd == "c") {
    rawIndex = 0;
    Serial.println(F("Buffer cleared"));
  } else if (cmd.length() > 0) {
    // Try to parse as hex bytes
    int b = (int)strtol(cmd.c_str(), NULL, 16);
    if (b >= 0 && b <= 255) {
      Serial.print(F(">> Sending hex: 0x"));
      Serial.println(b, HEX);
      Serial2.write((uint8_t)b);
    }
  }
}

void flushSerial2() {
  int c = 0;
  while (Serial2.available()) {
    Serial2.read();
    c++;
  }
  Serial.print(F("Flushed "));
  Serial.print(c);
  Serial.println(F(" bytes"));
}
