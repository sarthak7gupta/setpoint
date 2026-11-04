package com.setpoint.app

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable
import org.json.JSONObject

/**
 * Wear OS companion. Message path must match `@rn-libs/react-native-wearables`
 * (`/wearables_message`). JSON protocol mirrors `shared/wrist`.
 */
class MainActivity : ComponentActivity(), MessageClient.OnMessageReceivedListener {
  private val messagePath = "/wearables_message"

  private var active by mutableStateOf(false)
  private var labelA by mutableStateOf("Side A")
  private var labelB by mutableStateOf("Side B")
  private var pointsA by mutableStateOf("—")
  private var pointsB by mutableStateOf("—")
  private var sets by mutableStateOf("")
  private var serving by mutableStateOf("")
  private var paused by mutableStateOf(false)
  private var overlay by mutableStateOf(false)
  private var complete by mutableStateOf(false)
  private var canUndo by mutableStateOf(false)
  private var status by mutableStateOf("Open a live match on the phone")

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    Wearable.getMessageClient(this).addListener(this)
    setContent {
      MaterialTheme {
        WristBoard(
          active = active,
          labelA = labelA,
          labelB = labelB,
          pointsA = pointsA,
          pointsB = pointsB,
          sets = sets,
          serving = serving,
          paused = paused,
          overlay = overlay,
          complete = complete,
          canUndo = canUndo,
          status = status,
          onPoint = { side -> sendCommand("point", side) },
          onFault = { sendCommand("fault") },
          onUndo = { sendCommand("undo") },
          onPause = { sendCommand("pause") },
          onResume = { sendCommand("resume") },
          onSkip = { sendCommand("skip") },
        )
      }
    }
  }

  override fun onDestroy() {
    Wearable.getMessageClient(this).removeListener(this)
    super.onDestroy()
  }

  override fun onMessageReceived(messageEvent: MessageEvent) {
    if (messageEvent.path != messagePath) return
    try {
      val json = JSONObject(String(messageEvent.data, Charsets.UTF_8))
      if (json.optString("protocol") != "setpoint-wrist") return
      if (json.optString("kind") != "board") return
      runOnUiThread {
        active = json.optBoolean("active", false)
        labelA = json.optString("labelA", "Side A")
        labelB = json.optString("labelB", "Side B")
        pointsA = json.optString("pointsA", "—")
        pointsB = json.optString("pointsB", "—")
        sets = json.optString("sets", "")
        serving = json.optString("serving", "")
        paused = json.optBoolean("paused", false)
        overlay = json.optBoolean("overlay", false)
        complete = json.optBoolean("complete", false)
        canUndo = json.optBoolean("canUndo", false)
        status = when {
          !active -> "Open a live match on the phone"
          complete -> "Match complete"
          paused -> "Paused"
          overlay -> "Timer — Skip or wait"
          else -> "Tap a side to award the point"
        }
      }
    } catch (error: Exception) {
      Log.e("SetPointWear", "Bad board payload", error)
    }
  }

  private fun sendCommand(action: String, side: String? = null) {
    val payload = JSONObject().apply {
      put("protocol", "setpoint-wrist")
      put("version", 1)
      put("kind", "command")
      put("action", action)
      put("at", System.currentTimeMillis())
      if (side != null) put("side", side)
    }
    val bytes = payload.toString().toByteArray(Charsets.UTF_8)
    Wearable.getNodeClient(this).connectedNodes.addOnSuccessListener { nodes ->
      val node = nodes.firstOrNull { it.isNearby } ?: nodes.firstOrNull()
      if (node == null) {
        status = "Phone not reachable"
        return@addOnSuccessListener
      }
      Wearable.getMessageClient(this)
        .sendMessage(node.id, messagePath, bytes)
        .addOnFailureListener { error ->
          Log.e("SetPointWear", "Send failed", error)
          status = "Send failed"
        }
    }
  }
}

@Composable
private fun WristBoard(
  active: Boolean,
  labelA: String,
  labelB: String,
  pointsA: String,
  pointsB: String,
  sets: String,
  serving: String,
  paused: Boolean,
  overlay: Boolean,
  complete: Boolean,
  canUndo: Boolean,
  status: String,
  onPoint: (String) -> Unit,
  onFault: () -> Unit,
  onUndo: () -> Unit,
  onPause: () -> Unit,
  onResume: () -> Unit,
  onSkip: () -> Unit,
) {
  val scoringEnabled = active && !complete && !paused && !overlay
  Column(
    modifier = Modifier
      .fillMaxSize()
      .padding(8.dp),
    verticalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterVertically),
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    Text(
      text = sets.ifBlank { "SetPoint" },
      textAlign = TextAlign.Center,
    )
    Row(
      modifier = Modifier.fillMaxWidth(),
      horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
      Chip(
        onClick = { onPoint("a") },
        enabled = scoringEnabled,
        label = {
          Text("$labelA\n$pointsA" + if (serving == "a") "\nSERVE" else "")
        },
        modifier = Modifier.weight(1f),
      )
      Chip(
        onClick = { onPoint("b") },
        enabled = scoringEnabled,
        label = {
          Text("$labelB\n$pointsB" + if (serving == "b") "\nSERVE" else "")
        },
        modifier = Modifier.weight(1f),
      )
    }
    Text(text = status, textAlign = TextAlign.Center)
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
      Button(onClick = onFault, enabled = scoringEnabled) { Text("Fault") }
      Button(onClick = onUndo, enabled = canUndo) { Text("Undo") }
      if (paused) {
        Button(onClick = onResume) { Text("Resume") }
      } else {
        Button(onClick = onPause, enabled = active && !complete) { Text("Pause") }
      }
    }
    if (overlay) {
      Button(onClick = onSkip) { Text("Skip timer") }
    }
  }
}
