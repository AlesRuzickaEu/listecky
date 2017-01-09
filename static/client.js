/* helper functions */
function startInterval(milliseconds, callback){
    callback();
    return setInterval(callback, milliseconds);
}

$(document).ready(
    function(){
        var socket = io();

        if (typeof isDetailView === 'undefined') isDetailView = false;

        if (isDetailView){

            var statusButtons = $('.l-buttons--student .l-button');

            statusButtons
                .click(function(){
                    statusButtons
                        .removeClass('l-selected');

                    $(this)
                        .addClass('l-clicked')
                        .closest('.l-buttons')
                        .addClass('l-clicked');

                    console.info('statusChange', thisDeskId, thisChairId, $(this).data('status-id'));

                    socket.emit('statusChange', thisDeskId, thisChairId, $(this).data('status-id'));
                });

            socket
                .on('connect', function(){ // user authentication
                    startInterval(2000, function(){
                        socket.emit('auth-request', thisDeskId, thisChairId);
                    });
                })

                .on('checkStatusAlert', function(){ // Ask student for status
                    if (confirm('\n\n\n\nHotovo? \n\n\nOK pokud ano,\n\nCancel pokud ne.\n\n\n\n\n') == true){
                        socket.emit('statusChange', thisDeskId, thisChairId, 'done');
                    } else {
                        return false;
                    }
                })
            ;

            var nameForm = $('.l-name_form');
            var nameChangeformShowButton = $('.l-set_name');
            var nameRemoveButton = $('.l-unset_name');
            var namePlaceholder = $('.l-student_name-text');
            var nameInput = $('[name=studentName]');

            // show form if no name is set
            function setNameForm(studentName){
                if (studentName) namePlaceholder.text(studentName);

                if (namePlaceholder.text() == '' || namePlaceholder.text() == '?'){
                    nameInput.val('');
                    nameChangeformShowButton.hide();
                    nameRemoveButton.hide();
                    namePlaceholder.hide();
                    nameForm.show();
                    nameInput.focus();
                } else {
                    nameInput.val(namePlaceholder.text());
                    nameForm.hide();
                    nameChangeformShowButton.show();
                    nameRemoveButton.show();
                    namePlaceholder.show();
                }
            }

            setNameForm();

            // show form
            nameChangeformShowButton
                .on('click', function(){
                    nameChangeformShowButton.hide();
                    nameRemoveButton.hide();
                    namePlaceholder.hide();
                    nameForm.show();
                    nameInput.focus();
                    return false;
                })
            ;

            nameRemoveButton
                .on('click', function(event){
                    socket.emit('setStudentName', thisDeskId, thisChairId, '?');
                    event.preventDefault();
                })
            ;


            // send data from form
            nameForm
                .submit(function(event){
                    socket.emit('setStudentName', thisDeskId, thisChairId, nameInput.val());
                    event.preventDefault();
                })
            ;

            // window.onbeforeunload = function(){ return 'Opravdu chceš odejít z téhle stránky?'; };

        } else { // room overview

            function setDeskChairStatuses(room){
                if (room){

                    $('[data-desk-id]')
                        .each(function(){
                            var desk = room.desks[$(this).data('desk-id')];

                            // set desk status
                            $(this)
                                .find('.l-desk-shape > div')
                                .prop('class', 'l-status--' + desk.status)
                                .end()
                                .find('[data-chair-id]')
                                .each(function(){
                                    var chair = desk.chairs[$(this).data('chair-id')];
                                    $(this)
                                        .prop('class', 'l-status--' + chair.status) // set chair status
                                        .text(chair.name) // set student name
                                    ;
                                })
                            ;
                        })
                    ;
                }
            }

            var chatInput = $('[name=chatMessage]').focus();

            $('.l-chat-form')
                .submit(function(event){
                    socket.emit('chatMessageSend', chatInput.val());
                    chatInput.val('').focus();
                    event.preventDefault();
                });

            chatInput.keydown(function(event){
                if ((event.ctrlKey || e.metaKey) && (event.keyCode == 13 || event.keyCode == 10)){
                    $('.l-chat-form').submit();
                }
            });

            // get data with a little delay to allow disconnection events even in case of using the back button
            window.setTimeout(function(){
                socket.emit('getRoom');
            }, 50);

            // ping server every 29 minutes to maintain it alive
            window.setInterval(function(){
                socket.emit('keepAlive');
            }, 29 * 60 * 1000);
        }

        window.setTimeout(function(){
            socket.emit('getChatMessages');
        }, 100);

        // universal simple emiting
        $('[data-emit]')
            .click(function(event){
                console.info('simple-emit', $(this).data('emit'));
                if ($(this).data('require-input')){
                    var breakLength = window.prompt('Zadej délku přestávky v minutách', '10');
                    if (breakLength) socket.emit($(this).data('emit'), breakLength);
                } else {
                    socket.emit($(this).data('emit'));
                }
                event.preventDefault();
            })
        ;

        // fill chat log with messages

        function chatFill(chatMessages){
            var chatDeleteMessageButton = $('[data-emit=chatLastMessageDelete]');
            var chatLog = $('.l-chat-log');
            var chatLength = chatMessages.length;

            chatLog.empty();

            if (chatLength && chatDeleteMessageButton){
                chatDeleteMessageButton.show();
            } else {
                chatDeleteMessageButton.hide();
            }

            for (var i = 0; i < chatLength; i++){
                chatLog.prepend('<div class="l-chat-message">' + chatMessages[i] + '</div>');
            }
        }

        // format time in milliseconds to readable format
        function msToTime(duration){
            var hours = Math.round((duration / (1000 * 60 * 60)) % 24);
            var minutes = Math.round((duration / (1000 * 60)) % 60);
            /*var seconds = Math.round((duration / 1000) % 60);*/

            var hoursString = (hours < 10) ? '0' + hours : hours;
            var minutesString = (minutes < 10) ? '0' + minutes : minutes;
            /*var secondsString = (seconds < 10) ? '0' + seconds : seconds;*/

            var timeString = hoursString + ':' + minutesString;
            /*if (hours === 0 && minutes < 1) timeString += ':' + secondsString;*/
            return timeString;
        }

        // format time in milliseconds to a human readable sentence
        function breakTimeLeft(duration){
            var minutes = Math.round((duration / (1000 * 60)));
            var timeString;

            switch (minutes){
                case 0:
                    timeString = 'Začneme za necelou minutu.';
                    break;
                case 1:
                    timeString = 'Zbývá už jen minuta přestávky.';
                    break;
                case 2:
                case 3:
                case 4:
                    timeString = 'Přestávka končí za ' + minutes + ' minuty.';
                    break;
                default:
                    timeString = 'Přestávka končí za ' + minutes + ' minut.';
                    break;
            }
            return timeString;
        }

        var roomStatusText = $('.l-room_status_info-status-text');
        var roomStatusDurationText = $('.l-room_status_info-duration-text');
        var breakDurationText = $('.l-break_countdown-time');

        socket
            .on('connect', function(){ // user authentication
                socket.on('auth-success', function(room){
                    console.info('*** auth-success');
                    if (!isDetailView) setDeskChairStatuses(room);
                });
            })

            .on('disconnected', function(room){ // user disconnected: room overview
                console.info('††† disconnected');

                if (!isDetailView) setDeskChairStatuses(room);
            })

            .on('statusChanged', function(deskId, chairId, statusType, room){ // status changed
                console.info('>>> statusChanged', 'desk', deskId, 'chair', chairId, statusType);

                if (isDetailView){
                    if (thisDeskId == deskId && thisChairId == chairId){
                        statusButtons.each(function(){
                            $(this).removeClass('l-clicked l-selected');
                            if ($(this).data('status-id') == statusType){
                                $(this)
                                    .addClass('l-selected')
                                    .closest('.l-buttons')
                                    .removeClass('l-clicked');
                            }
                        });
                    }
                } else {
                    setDeskChairStatuses(room);
                }
            })

            .on('deskStatusChanged', function(room){ // status changed
                console.info('▒▒▒ deskStatusChanged');
                if (!isDetailView) setDeskChairStatuses(room);
            })

            .on('studentNameSet', function(deskId, chairId, studentName, room){ // name set
                if (isDetailView){
                    if (thisDeskId == deskId && thisChairId == chairId){
                        setNameForm(studentName);
                    }
                } else {
                    setDeskChairStatuses(room);
                }
            })

            .on('lectureStarted', function(roomStatus){
                console.info('lectureStarted');

                $('body').prop('class', 'l-room_status--' + roomStatus);

                if (isDetailView){
                    window.alert('Výklad začíná');
                } else {
                    roomStatusText.text(roomStatus);
                }
            })

            .on('workStarted', function(roomStatus){
                console.info('workStarted');

                $('body').prop('class', 'l-room_status--' + roomStatus);

                if (!isDetailView) roomStatusText.text(roomStatus);
            })

            .on('breakStarted', function(roomStatus, breakTimeLeft){
                console.info('breakStarted');

                $('body').prop('class', 'l-room_status--' + roomStatus);

                if (isDetailView){
                    // window.alert('Začala přestávka');
                    breakDurationText.text(breakTimeLeft(breakTimeLeft));
                } else {
                    roomStatusText.text(roomStatus + ' ' + msToTime(breakTimeLeft));
                }
            })

            .on('breakTimeChanged', function(roomStatus, breakTimeLeft){
                roomStatusText.text(roomStatus + ' ' + msToTime(breakTimeLeft));

                if (isDetailView){
                    breakDurationText.text(breakTimeLeft(breakTimeLeft));
                }

            })

            .on('breakTimeEnded', function(roomStatus, isByTimer){
                console.info('breakTimeEnded', roomStatus, isByTimer);

                roomStatusText.text(roomStatus);

                if (isDetailView){
                    if (isByTimer) window.alert('Jsi tu?');
                }

                $('body').prop('class', 'l-room_status--' + roomStatus);

            })

            .on('stopwatchTimeChanged', function(stopwatchTime){
                roomStatusDurationText.text(msToTime(stopwatchTime, true));
            })

            .on('chatMessagesSent', function(chatMessages){
                console.info('chatMessagesSent');
                chatFill(chatMessages);
            })

            .on('roomSent', function(room){
                console.info('roomSent');
                // console.log(room);
                if (!isDetailView) setDeskChairStatuses(room);
            })
        ;
    }
);
