// HC-SR04 Debug Sketch
// Reads distance via TRIG/ECHO pulse timing and prints to serial.
// No external libraries required.

#define TRIG_PIN 27
#define ECHO_PIN 26
#define SOUND_SPEED 0.034
#define MAX_TIMEOUT_US 30000

#define CONTINUOUS_INTERVAL_MS 2000

bool continuousMode = true;
unsigned long lastReading = 0;
unsigned long readingsTaken = 0;

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println(F("\n========== HC-SR04 Debug =========="));
  Serial.println(F("TRIG pin: GPIO27 (OUTPUT, 10us pulse)"));
  Serial.println(F("ECHO pin: GPIO26 (INPUT, 5V->3.3V via 2.2k+1k divider)"));
  Serial.println(F("Range: 2cm - 400cm"));
  Serial.println(F("Resolution: ~0.3cm"));
  Serial.println();
  Serial.println(F("Commands:"));
  Serial.println(F("  t   trigger one reading"));
  Serial.println(F("  c   toggle continuous mode"));
  Serial.println(F("  i   show stats"));
  Serial.println(F("====================================\n"));

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);
}

void loop() {
  handleSerialInput();

  if (continuousMode && millis() - lastReading >= CONTINUOUS_INTERVAL_MS) {
    lastReading = millis();
    takeReading();
  }
}

void takeReading() {
  float distance = readDistance();

  readingsTaken++;

  Serial.print(F("[T+"));
  Serial.print(millis() / 1000);
  Serial.print(F("s]"));

  if (distance < 0) {
    Serial.println(F("  No echo (sensor out of range or not connected)"));
    return;
  }

  Serial.print(F("  Distance: "));
  Serial.print(distance, 1);
  Serial.print(F(" cm"));
  Serial.println();
}

float readDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, MAX_TIMEOUT_US);

  if (duration == 0) return -1;

  return (duration * SOUND_SPEED) / 2.0;
}

void handleSerialInput() {
  if (!Serial.available()) return;

  char c = Serial.read();

  switch (c) {
    case 't': {
      Serial.println(F(">> Triggering one-shot reading..."));
      takeReading();
      break;
    }
    case 'c': {
      continuousMode = !continuousMode;
      Serial.print(F(">> Continuous mode: "));
      Serial.println(continuousMode ? F("ON") : F("OFF"));
      if (continuousMode) lastReading = 0;
      break;
    }
    case 'i': {
      Serial.print(F(">> Readings taken: "));
      Serial.println(readingsTaken);
      Serial.print(F("   Continuous mode: "));
      Serial.println(continuousMode ? F("ON") : F("OFF"));
      Serial.print(F("   Interval: "));
      Serial.print(CONTINUOUS_INTERVAL_MS);
      Serial.println(F(" ms"));
      break;
    }
  }
}
