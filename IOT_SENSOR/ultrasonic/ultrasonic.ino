// HC-SR04 Distance Sensor with MQTT
// Samples at 50ms internally, publishes smoothed reading every 30s via MQTT/TLS.

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <NewPing.h>

#include "secrets.h"

#define TRIG_PIN 5
#define ECHO_PIN 18
#define MAX_DISTANCE 450

#define FLOAT_SWITCH_1M 33
#define FLOAT_SWITCH_2M 32

#define PING_INTERVAL_MS 50
#define PUBLISH_INTERVAL_MS 10000
#define WIFI_TIMEOUT_MS 20000

#define WINDOW_SIZE 10

NewPing sonar(TRIG_PIN, ECHO_PIN, MAX_DISTANCE);

WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

unsigned int sampleWindow[WINDOW_SIZE];
int sampleIndex = 0;
int samplesCollected = 0;
float smoothedDistance = 60;

unsigned long lastPingTime = 0;
unsigned long lastPublishTime = 0;
unsigned long lastReconnectAttempt = 0;

bool floatSwitch1mState = false;
bool floatSwitch2mState = false;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println(F("\n========== HC-SR04 MQTT =========="));
  Serial.println(F("TRIG: GPIO26  |  ECHO: GPIO27"));
  Serial.println(F("Float1: GPIO33 (1m) | Float2: GPIO32 (2m)"));

  pinMode(FLOAT_SWITCH_1M, INPUT_PULLUP);
  pinMode(FLOAT_SWITCH_2M, INPUT_PULLUP);

  connectWiFi();

  wifiClient.setInsecure();

  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(callback);
}

void loop() {
  if (!mqttClient.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = now;
      reconnectMQTT();
    }
  } else {
    mqttClient.loop();
  }

  unsigned long currentTime = millis();

  floatSwitch1mState = digitalRead(FLOAT_SWITCH_1M) == HIGH;
  floatSwitch2mState = digitalRead(FLOAT_SWITCH_2M) == HIGH;

  if (currentTime - lastPingTime >= PING_INTERVAL_MS) {
    lastPingTime = currentTime;

    unsigned int distance = sonar.ping_cm();

    if (distance > 0) {
      sampleWindow[sampleIndex] = distance;
      sampleIndex = (sampleIndex + 1) % WINDOW_SIZE;
      if (samplesCollected < WINDOW_SIZE) samplesCollected++;
    }
  }

  if (currentTime - lastPublishTime >= PUBLISH_INTERVAL_MS) {
    lastPublishTime = currentTime;
    publishReading();
  }
}

void connectWiFi() {
  Serial.print(F("Connecting to WiFi"));
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(F("."));
    if (millis() - start > WIFI_TIMEOUT_MS) {
      Serial.println(F("\nWiFi connection timeout"));
      Serial.println(F("Restarting..."));
      ESP.restart();
    }
  }

  Serial.println();
  Serial.print(F("Connected. IP: "));
  Serial.println(WiFi.localIP());
}

void reconnectMQTT() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  Serial.print(F("Connecting to MQTT..."));

  if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
    Serial.println(F(" connected"));
  } else {
    Serial.print(F(" failed (rc="));
    Serial.print(mqttClient.state());
    Serial.println(F(")"));
  }
}

void publishReading() {
  int distanceMM = 0;
  float displayCm = 0.0;

  if (samplesCollected > 0) {
    unsigned int farthest = 0;
    for (int i = 0; i < samplesCollected; i++) {
      if (sampleWindow[i] > farthest) farthest = sampleWindow[i];
    }

    float diff = abs((float)farthest - smoothedDistance);

    if (diff > 2) {
      if (diff > 30) {
        smoothedDistance = (farthest * 0.7) + (smoothedDistance * 0.3);
      } else {
        smoothedDistance = (farthest * 0.4) + (smoothedDistance * 0.6);
      }
    }

    distanceMM = (int)(smoothedDistance * 10);
    displayCm = smoothedDistance;
  }

  Serial.print(F("Dist: "));
  if (samplesCollected > 0) {
    Serial.print(displayCm);
    Serial.print(F(" cm"));
  } else {
    Serial.print(F("NO RD"));
  }
  Serial.print(F("  |  Float1: "));
  Serial.print(floatSwitch1mState ? "TRIGGERED" : "at rest");
  Serial.print(F("  |  Float2: "));
  Serial.println(floatSwitch2mState ? "TRIGGERED" : "at rest");

  char payload[196];
  snprintf(payload, sizeof(payload),
    "{\"sensor_id\":\"SR04M-2\",\"distance_mm\":%d,\"water_level_cm\":%.1f,"
    "\"float_switch_1m\":%s,\"float_switch_2m\":%s}",
    distanceMM, displayCm,
    floatSwitch1mState ? "true" : "false",
    floatSwitch2mState ? "true" : "false");

  if (mqttClient.publish(MQTT_TOPIC, payload)) {
    Serial.print(F("Published: "));
    Serial.println(payload);
  } else {
    Serial.println(F("Publish failed"));
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print(F("MQTT msg ["));
  Serial.print(topic);
  Serial.print(F("]: "));
  for (unsigned int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
}
