import {
  registerPlugin,
  PopupRequest,
  ChecklistElement,
} from "@pexip/plugin-api";

import {
  policeIcon,
  policeHoverIcon,
  mapIcon,
  mapHoverIcon,
  documentIcon,
  documentHoverIcon,
  statementIcon,
  statementHoverIcon,
  manageParticipantIcon,
  manageParticipantHoverIcon,
} from "./resources";

import { StatementForm, GeolocationPrompt } from "./data";

import { toastMessages } from "./toast";

let selfUiid = "";
let selfName = "";
let selfRole = "";

let urlPop = "";

let confAlias = "";

let selectedParticipant = "";
let selectedParticipantName = "";

let rosterList = null;
let RosterListCount = 0;
let geolocation = null;

//Select drop-down
let participantListOptions: ChecklistElement["options"];
let feccListOptions: ChecklistElement["options"];

//Register Plugin
const plugin = await registerPlugin({
  id: "police-workflow-plugin",
  version: 1.0,
});

//Define Button Group
const Workflow_Button = await plugin.ui
  .addButton({
    position: "toolbar",
    icon: {
      custom: { main: policeIcon, hover: policeHoverIcon },
    },
    tooltip: "Police Statement Workflow",
    roles: ["chair"],
    isActive: true,
    group: [
      {
        id: "manage-participant",
        position: "toolbar",
        icon: {
          custom: {
            main: manageParticipantIcon,
            hover: manageParticipantHoverIcon,
          },
        },
        tooltip: "Manage Participant",
        roles: ["chair"],
      },
      {
        id: "location-request",
        position: "toolbar",
        icon: {
          custom: { main: mapIcon, hover: mapHoverIcon },
        },
        tooltip: "Request Location",
        roles: ["chair"],
      },
      {
        id: "share-statement",
        position: "toolbar",
        icon: {
          custom: { main: documentIcon, hover: documentHoverIcon },
        },
        tooltip: "Share Statement",
        roles: ["chair"],
        isActive: false,
      },
      {
        id: "approve-statement",
        icon: {
          custom: { main: statementIcon, hover: statementHoverIcon },
        },
        position: "toolbar",
        roles: ["chair"],
        tooltip: "Approve Statement",
      },
      {
        id: "meeting-wrapup",
        icon: "IconLeave",
        position: "toolbar",
        roles: ["chair"],
        tooltip: "Wrap-up",
      },
    ],
  })
  .catch((e) => {
    console.warn(e);
  });

Workflow_Button?.onClick.add(async ({ buttonId }) => {
  switch (buttonId) {
    case "manage-participant":
      manageParticipant();
      break;
    case "location-request":
      locationRequest();
      break;
    case "share-statement":
      shareStatement();
      break;
    case "approve-statement":
      approveStatement();
      break;
    case "meeting-wrapup":
      wrapUp();
      break;
  }
});

//await plugin.ui.showToast({ message: "Starting Police Workflow Plugin...🌏" });

await plugin.events.authenticatedWithConference.add((alias) => {
  void plugin.ui.showToast({
    message: `🏠 Welcome to Pexip Meeting: ` + alias.conferenceAlias,
  });
  console.log("Authenticated Conference", alias);
});

await plugin.events.me.add((self) => {
  selfUiid = self.participant.uuid;
  selfName = self.participant.uri;
  selfRole = self.participant.role;
});

await plugin.events.connected.add(() => {
  // Is connected
});

await plugin.events.layoutUpdate.add((layout) => {
  console.log("Layout: ", layout);
});

await plugin.events.conferenceStatus.add((conference) => {
  console.log("Conference Status: ", conference);
});

await plugin.events.participants.add((roster) => {
  console.log("Participants:", roster);

  const particpantRoster = roster.participants.map((participant, index) => ({
    id: participant.uuid,
    label: participant.uri.replace("sip:", ""),
  }));

  const guestParticipants = roster.participants
    .filter((participant) => participant.isHost === false)
    .map((participant, index) => ({
      id: participant.uuid,
      label: participant.uri.replace("sip:", ""),
    }));
});

plugin.events.directMessage.add((message) => {
  void plugin.ui.showToast({
    message: `${message.displayName}: ${message.message}`,
  });
  console.log("Direct Message Recieved: ", message);
});

plugin.events.message.add((message) => {
  console.log("Chat Message Recieved:", message);
});

plugin.events.participants.add((roster) => {
  const particpantRoster = roster.participants.map((participant, index) => ({
    id: participant.uuid,
    label: participant.uri.replace("sip:", ""),
  }));
  participantListOptions = particpantRoster;
});

plugin.events.disconnected.add((reason) => {
  //Disconnect
});

plugin.events.participantJoined.add((participant) => {
  if (participant.participant.uuid !== selfUiid) {
    void plugin.ui.showToast({
      message: `${participant.participant.uri.replace(
        "sip:",
        ""
      )} has joined call 👋`,
    });
  }
});

plugin.events.participantLeft.add((participant) => {
  if (participant.participant.uuid !== selfUiid) {
    void plugin.ui.showToast({
      message: `${participant.participant.uri.replace(
        "sip:",
        ""
      )} has left call 👋`,
    });
  }
});

//Manage Participant
async function manageParticipant() {
  console.log("Manage Participant: ", participantListOptions);

  const input = await plugin.ui.addForm({
    title: "Manage Participant",
    description: "Select participant for interaction.",
    form: {
      elements: {
        participantList: {
          name: "Select participant to manage:",
          type: "select",
          options: participantListOptions,
        },
        meetingOptions: {
          name: "Meeting Options:",
          type: "checklist",
          options: [
            { id: "spotlightUser", label: "Spotlight User", checked: true },
            {
              id: "spotlightSelf",
              label: "Spotlight Self (secondary)",
              checked: true,
            },
            { id: "focusLayout", label: "Focussed Layout (1:1)" },
            { id: "lockConference", label: "Lock Meeting" },
          ],
        },
      },
      submitBtnTitle: "Apply",
    },
  });

  input.onInput.add((formInput) => {
    selectedParticipant = formInput.participantList;
    input.remove();
    const meetingOptions = formInput.meetingOptions;
    console.log("Set conference");
    setConference(meetingOptions);
    console.log("Set spotlight");
    setSpotlight(meetingOptions);
  });
  //logger.debug(input);
}

//Location Request
async function locationRequest() {
  console.log("Location Request");
  plugin.conference.sendApplicationMessage({
    payload: { pexCommand: "requestGeolocation" },
    participantUuid: selectedParticipant,
  });
  plugin.ui.showToast({ message: "Location request pending 📌" });
}

//Share Statement
async function shareStatement() {
  console.log("Share Statement");

  plugin.conference.sendMessage({
    payload: "Your Statement: " + "https://cms.docs.gov.au/doc-123456789.pdf/",
  });
  plugin.ui.showToast({
    message: "Document link has been shared via chat 💬",
  });

  plugin.conference.sendApplicationMessage({
    payload: { pexCommand: "sharingStatement" },
    participantUuid: selectedParticipant,
  });
}

//Approve Statement
async function approveStatement() {
  console.log("Approve Statement");
  plugin.conference.sendApplicationMessage({
    payload: { pexCommand: "requestSignStatement" },
    participantUuid: selectedParticipant,
  });
  plugin.ui.showToast({
    message: "Approval request sent...",
  });
}

//Wrap Up
async function wrapUp() {
  console.log("Wrap up");
  const input = await plugin.ui.addForm({
    title: "Meeting Wrap-up",
    description: "What would you like to do?",
    form: {
      elements: {
        actionList: {
          name: "Action List:",
          type: "select",
          options: [
            { id: "endMeeting", label: "End Meeting" },
            { id: "leaveMeeting", label: "Leave Meeting" },
            { id: "somethingElse", label: "Something Else Perhaps" },
          ],
        },
      },
      submitBtnTitle: "Apply",
    },
  });

  input.onInput.add((formInput) => {
    var selectedWrapupOption = formInput.actionList;
    console.log("Wrap-up Selection: ", selectedWrapupOption);

    input.remove();

    if (selectedWrapupOption === "endMeeting") {
      var disconnectAll = plugin.conference.disconnectAll({});
      plugin.ui.showToast({ message: "The meeting is ending..." });
    }

    if (selectedWrapupOption === "leaveMeeting") {
      //This needs some attention as not working (me = uuid)

      var disconnectSelf = plugin.conference.disconnect({
        participantUuid: selfUiid,
      });
      plugin.ui.showToast({ message: "You are leaving the meeting..." });
    }

    if (selectedWrapupOption === "somethingElse") {
      plugin.ui.showToast({
        message: "Have a great day 🎈",
      });
    }
  });
}

function setConference(meetingOptions) {
  if (meetingOptions["focusLayout"] === true) {
    var setLayout = plugin.conference.setLayout({
      transforms: { layout: "1:0" },
    });
  } else {
    var setLayout = plugin.conference.setLayout({
      transforms: { layout: "1:7" },
    });
  }

  if (meetingOptions["lockConference"] === true) {
    var lockconference = plugin.conference.lock({
      lock: true,
    });
  } else {
    var lockconference = plugin.conference.lock({
      lock: false,
    });
  }
}

function setSpotlight(meetingOptions) {
  clearAllSpotlights();

  //Spotlight Participants
  if (meetingOptions["spotlightUser"] === true) {
    var setSpotlight = plugin.conference.spotlight({
      enable: true,
      participantUuid: selectedParticipant,
    });
  } else {
    var setSpotlight = plugin.conference.spotlight({
      enable: false,
      participantUuid: selectedParticipant,
    });
  }

  //Spotlight Self
  if (meetingOptions["spotlightSelf"] === true) {
    var setSpotlight = plugin.conference.spotlight({
      enable: true,
      participantUuid: selfUiid,
    });
  } else {
    var setSpotlight = plugin.conference.spotlight({
      enable: false,
      participantUuid: selfUiid,
    });
  }
}

function clearAllSpotlights() {
  try {
    //console.log("Participant List: ", participantListOptions)
    participantListOptions.forEach((element) => {
      var uuid = element.id;
      var setSpotlight = plugin.conference.spotlight({
        enable: false,
        participantUuid: uuid,
      });
    });
  } catch (error) {}
}

const applicationMessageReceiver = plugin.events.applicationMessage.add(
  async (message) => {
    let appMsg = JSON.stringify(message.message);
    console.log("Application Message:", message);

    const applicationSenderID = message.userId;

    if (appMsg.includes("requestGeolocation")) {
      void plugin.ui.showToast({
        message: `${message.displayName} has requested your location 📌`,
      });

      const input = await plugin.ui.showPrompt(GeolocationPrompt);

      if (input === "Accept") {
        const pos = null;
        const geoLoc = navigator.geolocation;

        if (geoLoc) {
          let id = geoLoc.watchPosition(
            (position: Position) => {
              console.log(position);

              let geoInfo =
                "Latitude/Longitude(Accuracy): " +
                position.coords.latitude +
                ", " +
                position.coords.longitude +
                " (" +
                position.coords.accuracy.toFixed() +
                "m)";

              let googleMapLink =
                "https://www.google.com/maps/search/?api=1&query=" +
                position.coords.latitude +
                "," +
                position.coords.longitude;

              console.log(geoInfo);
              console.log(googleMapLink);

              plugin.conference.sendMessage({
                payload:
                  "📌 Location (~" +
                  position.coords.accuracy.toFixed() +
                  "m): " +
                  googleMapLink,
              });

              geoLoc.clearWatch(id);
            },
            (err: PositionError) => {
              plugin.conference.sendMessage({
                payload: "📌 Location not available",

                // + err.message,
              });
              console.log("📌", err);
            },
            {
              enableHighAccuracy: true,
              timeout: 1000,
            }
          );
        }
      } else {
        //On Dismiss action
        plugin.conference.sendMessage({
          payload: "📌 Location request denied",
        });
      }
    }

    if (appMsg.includes("sharingStatement")) {
      void plugin.ui.showToast({
        message: `${message.displayName} has shared statement via chat 💬`,
      });
      plugin.conference.sendMessage({
        payload: "User has recieved statement link for review 🧾",
      });
    }

    if (appMsg.includes("requestSignStatement")) {
      void plugin.ui.showToast({
        message: `${message.displayName} Please approve statement `,
      });
      const input = await plugin.ui.addForm(StatementForm);

      input.onInput.add((formInput) => {
        plugin.conference.sendMessage({
          payload: "✅ Statement has been signed: " + formInput.name,
        });
        plugin.conference.sendMessage({
          payload: "✅ Statement has been signed: " + formInput.name,
          participantUuid: applicationSenderID,
        });
        input.remove();
      });
    }
  }
);
