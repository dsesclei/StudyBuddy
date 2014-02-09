var test;
var schedule = []//[{"days":["M","T","W"],"time":"8:25am","prof":"Sesc","num":101},{"days":["M","T","W","TH","F"],"time":"9:30am","prof":"Jamie","num":313},{"days":["M","W","F"],"time":"7:00pm","prof":"Tyler","num":888},{"days":["T","W","TH"],"time":"12:30pm","prof":"Leo","num":1000}];
var userHasPreexistingSchedule = false;
$(document).ready(function () {
    var client_creds = {
        orgName: 'sescleifer',
        appName: 'sandbox',
        logging: true,
        buildCurl: true
    };

    var client = new Apigee.Client(client_creds); 
  
    var userID;
    window.fbAsyncInit = function() {
        FB.init({
          appId      : '210614229132362',
          status     : true,
          xfbml      : true
        });


        FB.Event.subscribe('auth.authResponseChange', function(response) {
            if (response.status === 'connected') {
                userID = parseInt(response.authResponse.userID);

                // Now query Apigee to see if they've already submitted a schedule
                // But only do this if the user hasn't entered any data in yet
                if (!$("TD_M").html()||$("TD_M").html().trim()=="") {
                    loadOwnSchedules(userID);
                }

            } else if (response.status === 'not_authorized') {
                console.log("one");
                //login();
            } else {
                console.log("two");
                //login();
            }
        });
    }

    window.findFriends = function() {
        var btn = $("#findFriends");
        btn.button('loading');

        scrollToBottom();

        FB.getLoginStatus(function(response) {
            if (response.status === 'connected') {
                var uid = response.authResponse.userID;
                var accessToken = response.authResponse.accessToken;
                getUniversityData();
            } else if (response.status === 'not_authorized') {
                login(function(response) {
                    if (response.authResponse) {
                        var uid = response.authResponse.userID;
                        var accessToken = response.authResponse.accessToken;
                        getUniversityData();
                    }
                    else {
                        cancelSearch();
                    }
                });
            } else {
                login(function(response) {
                    if (response.authResponse) {
                        var uid = response.authResponse.userID;
                        var accessToken = response.authResponse.accessToken;
                        getUniversityData();
                    }
                    else {
                        cancelSearch();
                    }
                });
            }
        });

    };

    function loadOwnSchedules(myUid) {
        console.log("Loading user schedule with uid: " + myUid);
        var query = "uid="+myUid;
        $.get("https://api.usergrid.com/sescleifer/sandbox/schedules?ql=" + query, function(data) {
            console.log("Schedule get!");
            console.log(data);
            console.log(e);
            var e = data["entities"];
            if (e.length == 0) {
                console.log("This user has never entered a schedule before!");
                // User has never had a schedule before so we're good
                return;
            }
            userHasPreexistingSchedule = true;

            // Just load the 0th schedule copy
            // We may have several matches (but hopefully not!)
            var thisSchedule = e[0]["schedule"];
            schedule = thisSchedule;
            console.log(schedule);
            displaySchedule();


        });

    }

    function cancelSearch() {
        var btn = $("#findFriends");
        btn.button('reset');
    }

    function login(callback) {
        console.log("Logging in");
        if (callback == null) {
            FB.login(function(){}, { scope: "user_education_history,friends_education_history" });
        }
        else {
            FB.login(function(response){
                callback(response);
            }, { scope: "user_education_history,friends_education_history" });
        }
    }

    function getUniversityData() {
        console.log("Getting university data...");
        FB.api(
            {
                method: "fql.query",
                query: "SELECT name, uid, pic_square, education FROM user WHERE uid IN (SELECT uid2 FROM friend WHERE uid1=me())"
            },
            function(data) {
                friendData = data;
                // If both API requests have finished
                if (typeof userData !== "undefined") {
                    processData();
                }
            }
        );

        FB.api(
            {
                method: "fql.query",
                query: "SELECT name, uid, pic_square, education FROM user WHERE uid=me()"
            },
            function(data) {
                userData = data[0];
                // If both API requests have finished
                if (typeof friendData !== "undefined") {
                    processData();
                }
            }
        );
    }

    function getUniversity(education) {
        var university;
        for (var i = 0; i < education.length; i++) {
            var school = education[i];
            // Convert the year from an object to an int
            if (typeof school.year !== "undefined") {
                school.year = parseInt(school.year["name"]);
            }

            if (school.type === "College") {
                if (typeof university === "undefined" || typeof university.year === "undefined") {
                    university = school;
                } else if (typeof school.year !== "undefined" && school.year > university.year) {
                    university = school;
                }
            }
        }

        if (typeof university !== "undefined") university = university.school["name"];
        return university;
    }

    function processData() {
        var uni = getUniversity(userData.education);
        if (typeof uni === "undefined") console.error("Could not get university!");

        var ids = [];
        for (var i = 0; i < friendData.length; i++) {
            var friendUni = getUniversity(friendData[i].education);
            if (uni === friendUni) {
                friends.push([friendData[i]["name"], friendData[i]["uid"]]);
                ids.push(friendData[i]["uid"]);
            }
        }

        // Only send the schedule if it's a new schedule
        //if (!userHasPreexistingSchedule) {
            sendSchedule();
        //}
        retrieveSchedules(ids);
    }

    //var schedule = [];
    var friends = [];
    function getDays() {
        var checked = [];
        var days = ["M", "T", "W", "TH", "F"];
        for (var i = 0; i < days.length; i++) {
            if ($("#" + days[i]).is(':checked')) {
                checked.push(days[i]);
            };
        }

        return checked;
    }

    $("#addClass").bind("click", function() {
        var course = {
            "days": getDays(),
            "time": $("#startTime").val() + $('input[name=startTimeAMPM]:checked', '#classForm').val(),
            "prof": $("#professor").val(),
            "num": parseInt($("#classNumber").val()),
        };
        schedule.push(course);
        displaySchedule();
        $("#classForm")[0].reset();
    });


    function standardizeTime(t) {
        var isPM = t.indexOf("pm") > -1;
        t = t.replace("pm", "");
        t = t.replace("am", "");
        var times = t.split(":");
        if (times[0] === "12") times[0] = "00";
        if (isPM) times[0] = parseInt(times[0]) + 12;
        return times[0] + ":" + times[1];
    }

    function compareTimes(h1, h2) {
        var t1 = standardizeTime(h1).split(":"),
            t2 = standardizeTime(h2).split(":");
        t1[0] = parseInt(t1[0]);
        t1[1] = parseInt(t1[1]);
        t2[0] = parseInt(t2[0]);
        t2[1] = parseInt(t2[1]);
        // Compare hours
        if (t1[0] > t2[0]) return 1;
        if (t1[0] < t2[0]) return -1;
        // Compare minutes
        if (t1[1] > t2[1]) return 1;
        if (t1[1] < t2[1]) return -1;
        // Same hours and same minutes => same time
        return 0;
    }

    function displaySchedule() {
        var days = {
            "M": [],
            "T": [],
            "W": [],
            "TH": [],
            "F": []
        };

        for (var i = 0; i < schedule.length; i++) {
            for (var j = 0; j < schedule[i].days.length; j++) {
                var courses = days[schedule[i].days[j]];
                var k = 0;
                for (; k < courses.length; k++) {
                    var comp = compareTimes(schedule[i]["time"], courses[k]["time"]);
                    if (comp < 1) {
                        break;
                    }
                }
                days[schedule[i].days[j]].splice(k, 0, schedule[i]);
            }
        }

        for (var day in days) {
            var html = "";
            for (var i = 0; i < days[day].length; i++) {
                var course = days[day][i];
                html += "<li><b>" + course["time"] + "</b><br>" + course["num"] + "<br>Prof. " + course["prof"] + "</li>";
                $("#TD_" + day).html(html);
            }
        }
    }

    function sendSchedule() {
        console.log("sent");
        var schedules = new Apigee.Collection({ "client": client, "type": "schedules" });
        schedules.addEntity({ "uid": userID, "schedule": schedule }, function(err, res) {
            if (err) console.error(err);
            else console.log("Successfully saved!");
        });
    };



    function retrieveSchedules(ids) {
        var query = "";
        for (var i = 0; i < ids.length; i++) {
            if (query.length > 0) {
                query += " or ";
            }
            query += "uid=" + ids[i];
        }
        $.get("https://api.usergrid.com/sescleifer/sandbox/schedules?ql=" + query, function(data) {

            var btn = $("#findFriends");
            btn.html("Done!");

            var e = data["entities"];
            if (e.length == 0) {
                outputMatch("Sorry, we couldn't find any matches.")
            }
            else {
                outputMatch("Hey! It looks like you have...")
            }

            console.log("point a");
            for (var i = 0; i < e.length; i++) {
                            console.log("point b");

                var thisFriend = e[i];

                // Compare the IDs we have with the ID in this object to find the name of the person it belongs to
                for (var j = 0; j < friends.length; j++) {
                                console.log("point c");

                    if (parseInt(friends[j][1]) === thisFriend["uid"]) {
                        thisFriend["name"] = friends[j][0];
                    }
                }


                // Find users with matching schedules
                // Our schedule = schedule
                // Array of friends' schedules = e[i].schedule
                var friendSchedule = thisFriend["schedule"];
                console.log(friendSchedule);
                for (var j = 0; j < friendSchedule.length; j++) {
                    // Iterate through the classes in our friend's schedule
                    var friendClass = friendSchedule[j];
                    for (var k = 0; k < schedule.length; k++) {
                        var ourClass = schedule[k];

                        testForMatch(ourClass, friendClass, thisFriend["name"]);
                    }
                }
            }
        });
    }

    function scrollToBottom() {
        console.log("scrolling")
        var filler = $("#filler");
        filler.show();
        filler.attr("height", 300); 

        // Set the animation variables to 0/undefined.
        var timeLapsed = 0.0;
        var percentage, position;

        var ease = function(time){
            return time < 0.5 ? 4 * time * time * time : (time - 1) * (2 * time - 2) * (2 * time - 2) + 1; // acceleration until halfway, then deceleration
        }

        var animateScroll = function() {
            timeLapsed += .02;
            offsetAmount = 10 * ease(timeLapsed);
            window.scrollBy( 0, offsetAmount );
            if (timeLapsed >= 1) {
                clearInterval(runAnimation);
            }
        }
        var runAnimation = setInterval(animateScroll, 16);
    }

    function testForMatch(ourClass, friendClass, friendName) {
        var classesMatch = ourClass["prof"]===friendClass["prof"] &&
                           ourClass["num"]===friendClass["num"];
        var sectionMatches = false;
        if (classesMatch) {
            sectionMatches = ourClass["time"]===friendClass["time"] &&
                             daySetsEqual(ourClass["days"],friendClass["days"]);
        }

        if (classesMatch && sectionMatches) {
            outputMatch("<strong>" + ourClass["num"] + "</strong> with <strong>" + friendName + "</strong>.");
        }
        else if (classesMatch) {
            outputMatch("<strong>" + ourClass["num"] + "</strong> with <strong>" + friendName + "</strong> but not in the same lecture.");
        }
    }

    function outputMatch(matchText) {
        var outputDiv = $("#sharedClasses");
        outputDiv.html(outputDiv.html()+"<h3>"+matchText+"</h3>");
    }

    function daySetsEqual(days1, days2) {
        if (days1.length != days2.length) {
            return false;
        }
        for (var i = 0; i < days1.length; i++) {
            if (days1[i]!==days2[i]) {
                return false;
            }
        }
        return true;
    }

    displaySchedule();

    window.setSchedule = function(person) {
        schedule = {
            "dave": [{"days":["T","TH"],"time":"2:30pm","prof":"Flores","num":240},{"days":["M","W","F"],"time":"11:00am","prof":"Paul","num":101},{"days":["F"],"time":"2:30pm","prof":"Rees","num":150},{"days":["M","T","W","TH","F"],"time":"8:25am","prof":"Wright","num":525}],
            "jamie": [{"days":["M","T","W","TH","F"],"time":"8:25am","prof":"Wright","num":525},{"days":["T","TH"],"time":"2:05pm","prof":"Michaels","num":407},{"days":["M","W","F"],"time":"10:30am","prof":"Messina","num":354}],
            "tyler": [{"days":["M","W","F"],"time":"8:00am","prof":"Paul","num":101},{"days":["T","TH"],"time":"2:30pm","prof":"Flores","num":240},{"days":["M","W","F"],"time":"3:00pm","prof":"Green","num":234}]
        }[person.toLowerCase()];
        displaySchedule();
    }
});