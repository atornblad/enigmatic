(function() {
    var dev = true;
    var rnd = Math.random;
    var timeOffset = 0;
    var frameDiff = 1;
    
    var getAny = function(names, target, fallback) {
        for (var i = 0; i < names.length; ++i) {
            var name = names[i];
            if (target[name]) {
                return target[name];
            }
        }
        
        return fallback;
    };
    
    var now = function() {
        return (new Date).getTime();
    };
    
    var reqAnimFrameFallback = function(func) {
        var now = (new Date).getTime();
        var next = (now - (now % 17)) + 17;
        var diff = next - now;
        if (diff < 5) diff = 17;
        window.setTimeout(function() {
            func.call(window, (new Date).getTime())
        }, diff);
    };
    
    var requestAnimationFrame = getAny([
        "requestAnimationFrame",
        "mozRequestAnimationFrame",
        "webkitRequestAnimationFrame"
    ], window, reqAnimFrameFallback);
    
    var width = 640;
    var height = 512;
    
    var pi = 4 * Math.atan(1);
    
    var halfWidth = width / 2;
    var halfHeight = height / 2;
    var largestHalf = Math.max(halfWidth, halfHeight);
    
    var smoothComplete = function(chapterComplete) {
        return (1 - Math.cos(chapterComplete * pi)) / 2;
    };
    
    var canvas, context, sinus, starPositions, currentQuality,
        starRotationY, starRotationX, starRotationYSpeed, starRotationXSpeed,
        starOffsetX, starOffsetXSpeed,
        lastTime, startTime, currentTime, currentChapterIndex = 0, currentRenderer,
        playing, mod, musiklinjen;
    
    
    
    // *** BALLS (episode #4)
    // 4.0 Glenzvector
    
    var glenzBallCoords = [
        {x : 0, y : -100, z : 0},
        {x : -70, y : -70, z : -70},
        {x : 70, y : -70, z : -70},
        {x : 70, y : -70, z : 70},
        {x : -70, y : -70, z : 70},
        {x : -100, y : 0, z : 0},
        {x : 0, y : 0, z : -100},
        {x : 100, y : 0, z : 0},
        {x : 0, y : 0, z : 100},
        {x : -70, y : 70, z : -70},
        {x : 70, y : 70, z : -70},
        {x : 70, y : 70, z : 70},
        {x : -70, y : 70, z : 70},
        {x : 0, y : 100, z : 0}
    ];
    
    var glenzBallTriangles = [
        {points : [0, 1, 2]},
        {points : [0, 2, 3]},
        {points : [0, 3, 4]},
        {points : [0, 4, 1]},
        
        {points : [4, 5, 1]},
        {points : [1, 6, 2]},
        {points : [2, 7, 3]},
        {points : [3, 8, 4]},
        
        {points : [9, 6, 1]},
        {points : [1, 5, 9]},
        {points : [2, 6, 10]},
        {points : [10, 7, 2]},
        {points : [11, 8, 3]},
        {points : [3, 7, 11]},
        {points : [4, 8, 12]},
        {points : [12, 5, 4]},
        
        {points : [9, 5, 12]},
        {points : [10, 6, 9]},
        {points : [11, 7, 10]},
        {points : [12, 8, 11]},
        
        {points : [9, 13, 10]},
        {points : [10, 13, 11]},
        {points : [11, 13, 12]},
        {points : [12, 13, 9]}
    ];
    
    var glenzBallRotationY = 0;
    var glenzBallRotationX = 0;
    var glenzBallPositionAngle = 0;
    var glenzBallTiming = 0;
    
    var ballsRenderer = function(subId, chapterOffset, chapterComplete, frameDiff) {
        context.globalAlpha = 1;
        var grd = context.createLinearGradient(0, 0, 0, height);
        grd.addColorStop(0, "#000000");
        grd.addColorStop(1, "#000033");
        context.fillStyle = grd;
        context.fillRect(0, 0, width, height);
        
        if (subId == 0) {
            context.globalAlpha = chapterComplete;
        }
        
        glenzBallRotationY += 317 * frameDiff;
        glenzBallRotationX += 131 * frameDiff;
        glenzBallTiming = (glenzBallTiming + frameDiff * 293) & 0xffff;
        glenzBallPositionAngle = (glenzBallPositionAngle + frameDiff * 113) & 0xffff;
        
        var glenzBallPositionY = 100 - 200 * Math.abs(sinus[glenzBallTiming]);

        var cosX = sinus[(glenzBallRotationX + 16384) & 0xffff]; // Math.cos(this.starRotation);
        var sinX = sinus[glenzBallRotationX & 0xffff]; // Math.sin(this.starRotation);
        var cosY = sinus[(glenzBallRotationY + 16384) & 0xffff]; // Math.cos(this.starRotation);
        var sinY = sinus[glenzBallRotationY & 0xffff]; // Math.sin(this.starRotation);
        
        var transformedCoords = new Array(glenzBallCoords.length);
        
        var positionX = sinus[glenzBallPositionAngle] * 200;
        var positionZ = sinus[(glenzBallPositionAngle + 16384) & 0xffff] * 200;
        
        for (var point, i = 0; point = glenzBallCoords[i]; ++i) {
            var temp = cubeRotateOffsetCoord([
                    point.x, point.y, point.z
                ], sinX, cosX, sinY, cosY, positionX, positionZ);
            temp.y += glenzBallPositionY;
            if (temp.y > 150) {
                temp.y = 150;
            }
            transformedCoords[i] = cubeGetScreenCoords(temp);
        }
        
        var backFacing = [];
        var frontFacing = [];

        for (var triangle, i = 0; triangle = glenzBallTriangles[i]; i++) {
            var screenCoords = [];

            for (var j = 0; j <= 2; ++j) {
                var point = transformedCoords[triangle.points[j]];
                screenCoords[j] = point;
            }
            
            var edgeSum = 0;
            for (var j = 0; j <= 2; ++j) {
                edgeSum += (screenCoords[(j + 1) % 3].x - screenCoords[j].x) *
                           (screenCoords[(j + 1) % 3].y + screenCoords[j].y);
            }
            if (edgeSum < 0) {
                backFacing.push(i);
            } else {
                frontFacing.push(i);
            }
        }
        
        for (var i = 0; i < backFacing.length; ++i) {
            var triangleIndex = backFacing[i];
            var triangle = glenzBallTriangles[triangleIndex];
            
            context.beginPath();
            for (var j = 0; j <= 2; ++j) {
                var point = transformedCoords[triangle.points[j]];
                if (j == 0)
                    context.moveTo(point.x, point.y);
                else
                    context.lineTo(point.x, point.y);
            }
            context.fillStyle = (triangleIndex & 1) ? "rgba(192, 0, 0, 0.4)" : "rgba(96, 128, 192, 0.3)";
            context.closePath();
            context.fill();
        }
        
        for (var i = 0; i < frontFacing.length; ++i) {
            var triangleIndex = frontFacing[i];
            var triangle = glenzBallTriangles[triangleIndex];
            
            context.beginPath();
            for (var j = 0; j <= 2; ++j) {
                var point = transformedCoords[triangle.points[j]];
                if (j == 0)
                    context.moveTo(point.x, point.y);
                else
                    context.lineTo(point.x, point.y);
            }
            context.fillStyle = (triangleIndex & 1) ? "rgba(255, 0, 0, 0.5)" : "rgba(255, 153, 153, 0.4)";
            context.closePath();
            context.fill();
        }
    };
    
    
    
    // *** MARS LANDSCAPE (episode #3)
    // 3.0 "Land on Mars" - descend from above
    // 3.1 "Tour of Mars"
    // 3.2 "Terraforming"
    // 3.3 "Tour of new Mars"
    // 3.4 "Leaving Mars"
    
    var marsGridWidth = 256; // The grid is square!
    var marsGridHeight = marsGridWidth;
    var marsArrayWidth = marsGridWidth + 1;
    var marsArrayHeight = marsArrayWidth;
    var marsArraySize = marsArrayWidth * marsArrayWidth;
    
    var marsMixHeight = function(a, b, step) {
        return (a + b + (rnd() - 0.5) * step / 8) / 2;
    };
    
    var marsHeightsFunc = function(seed) {
        var result = new Array(marsArraySize);
        result[0] = rnd() * 0.2 - 0.1 + seed;
        result[marsGridWidth] = rnd() * 0.2 - 0.1 + seed;
        result[marsGridHeight * marsArrayWidth] = rnd() * 0.2 - 0.1 + seed;
        result[marsGridHeight * marsArrayWidth + marsGridWidth] = rnd() * 0.2 - 0.1 + seed;
        var step = marsGridWidth;
        while (step >= 2) {
            var halfStep = step >> 1;
            for (var y = 0; y < marsArrayHeight; y += step) {
                for (var x = 0; x < marsArrayHeight; x += step) {
                    // I know that [x,y], [x+step,y], [x,y+step], [x+step,y+step] have values!
                    // Time to fill in [x+halfstep,y], [x,y+halfstep], [x+step,y+halvstep], [x+halfstep,y+step]
                    // And also the middle one [x+halfstep,y+halfstep]
                    var topLeft = result[y * marsArrayWidth + x];
                    var topRight = result[y * marsArrayWidth + x + step];
                    var bottomLeft = result[(y + step) * marsArrayWidth + x];
                    var bottomRight = result[(y + step) * marsArrayWidth + x + step];
                    
                    var top = marsMixHeight(topLeft, topRight, step);
                    var left = marsMixHeight(topLeft, bottomLeft, step);
                    var right = marsMixHeight(topRight, bottomRight, step);
                    var bottom = marsMixHeight(bottomLeft, bottomRight, step);
                    var middleFromTopBottom = marsMixHeight(top, bottom, step);
                    var middleFromLeftRight = marsMixHeight(left, right, step);
                    var middle = marsMixHeight(middleFromLeftRight, middleFromTopBottom, step);
                    
                    result[y * marsArrayWidth + x + halfStep] = Math.max(-0.6, Math.min(1, top));
                    result[(y + halfStep) * marsArrayWidth + x] = Math.max(-0.6, Math.min(1, left));
                    result[(y + halfStep) * marsArrayWidth + x + halfStep] = Math.max(-0.6, Math.min(1, middle));
                    result[(y + halfStep) * marsArrayWidth + x + step] = Math.max(-0.6, Math.min(1, right));
                    result[(y + step) * marsArrayWidth + x + halfStep] = Math.max(-0.6, Math.min(1, bottom));
                }
            }
            step = halfStep;
        }
        
        return result;
    };
    
    var marsHeights = marsHeightsFunc(0.7), marsHeights2 = marsHeightsFunc(0.3);
    
    var marsGetZFast = function(x, y) {
        // Always pass integers!!!
        switch (marsSubId) {
            case 0:
            case 1:
                return marsHeights[y * marsArrayWidth + x];
            case 2:
                return (1-marsSmoothCC) * marsHeights[y * marsArrayWidth + x] +
                       marsSmoothCC * marsHeights2[y * marsArrayWidth + x];
            case 3:
            case 4:
            default:
                return marsHeights2[y * marsArrayWidth + x];
        }
    };
    
    var marsGetZ = function(x, y) {
        var xF = Math.floor(x);
        var yF = Math.floor(y);
        var xFDist = x - xF;
        var yFDist = y - yF;
        var xF2 = xF + 1;
        var yF2 = yF + 1;
        
        var topLeft = marsGetZFast(xF, yF); //[yF * marsArrayWidth + xF];
        var topRight = marsGetZFast(xF2, yF); //[yF * marsArrayWidth + xF2];
        var bottomLeft = marsGetZFast(xF, yF2); //[yF2 * marsArrayWidth + xF];
        var bottomRight = marsGetZFast(xF2, yF2); // [yF2 * marsArrayWidth + xF2];
        
        var left = topLeft * (1 - yFDist) + bottomLeft * yFDist;
        var right = topRight * (1 - yFDist) + bottomRight * yFDist;
        
        return left * (1 - xFDist) + right * xFDist;
    };
    
    var marsRoverX = marsGridWidth / 2;
    var marsRoverY = marsGridWidth / 2;
    var marsAngle = 62000;
    var marsAddedZ = 10;
    var marsSpeed = 0;
    var marsAngleSpeed = 7;
    var marsSubId = 0;
    var marsSmoothCC = 0;
    var marsPlanetFactor = 0;
    
    var marsGetFill = function(z, dist) {
        var color;
        var dim = 1-(dist/18.2);
        
        var marsColor, earthColor;
        if (marsPlanetFactor < 1) {
            if (z <= 0) {
                marsColor = {r:200 + 150 * z,g:0,b:0};
            } else {
                marsColor = {r:120 + 120 * z,g:30 + 20 * z,b:10 + 20 * z};
            }
        } else marsColor = {r:0,g:0,b:0};
        
        if (marsPlanetFactor > 0) {
            if (z <= 0) {
                earthColor = {r:0,g:0,b:200 + 150 * z};
            } else {
                earthColor = {r:20 + 60 * z,g:80 + 100 * z,b:10 + 30 * z};
            }
        } else earthColor = {r:0,g:0,b:0};
        
        var r = marsColor.r * (1-marsPlanetFactor) + earthColor.r * marsPlanetFactor;
        var g = marsColor.g * (1-marsPlanetFactor) + earthColor.g * marsPlanetFactor;
        var b = marsColor.b * (1-marsPlanetFactor) + earthColor.b * marsPlanetFactor;
        
        return "rgba(" + (r).toFixed(0) + "," + (g).toFixed(0) + "," + (b).toFixed(0) + "," + dim.toFixed(3) + ")";
//        return "rgba(" + (dim*r).toFixed(0) + "," + (dim*g).toFixed(0) + "," + (dim*b).toFixed(0) + ",1)";
    };
    
    var marsSurfacesPartition = function(surfaces, left, right) {
        var pivot = surfaces[(left + right) >> 1],
            i = left,
            j = right;
        
        while (i <= j) {
            while (surfaces[i].dist > pivot.dist) {
                ++i;
            }
            
            while (surfaces[j].dist < pivot.dist) {
                --j;
            }
            
            if (i <= j) {
                if (i < j) {
                    var temp = surfaces[i];
                    surfaces[i] = surfaces[j];
                    surfaces[j] = temp;
                }
                
                ++i;
                --j;
            }
        }
        
        return i;
    };
    
    var marsSortSurfacesQuicksort = function(surfaces, left, right) {
        if (right > left) {
            var index = marsSurfacesPartition(surfaces, left, right);
            if (left < index - 1) {
                marsSortSurfacesQuicksort(surfaces, left, index - 1);
            }
            if (index < right) {
                marsSortSurfacesQuicksort(surfaces, index, right);
            }
        }
    };
    
    var marsSortSurfaces = function(surfaces) {
        marsSortSurfacesQuicksort(surfaces, 0, surfaces.length - 1);
    };
    
    var marsRenderer = function(subId, chapterOffset, chapterComplete, frameDiff) {
        var smoothCC = smoothComplete(chapterComplete);
        var smoothStart = (chapterComplete > 0.1) ? 1.0 : smoothComplete(chapterComplete * 10);
        var smoothEnd = (chapterComplete < 0.9) ? 1.0 : smoothComplete(10 - chapterComplete * 10);
        
        marsSubId = subId;
        marsSmoothCC = smoothCC;
        
        //context.clearRect(0, 0, width, height);
        
        switch (subId) {
            case 0:
                // Landing
                marsAddedZ = 20 - 19.2 * smoothCC;
                marsSpeed = 0;
                break;
            case 1:
                // Tour of Mars
                marsAddedZ = 0.8;
                marsSpeed = 0.04 * Math.min(smoothStart, smoothEnd);;
                break;
            case 2:
                // Terraforming
                marsSpeed = 0;
                marsPlanetFactor = smoothCC;
                break;
            case 3:
                // Tour of new Mars
                marsPlanetFactor = 1;
                marsSpeed = 0.04 * smoothStart;
                break;
            case 4:
                // Leaving Mars
                marsAddedZ = 0.8 + 19.2 * smoothCC;
                break;
        }
        
        marsAngle = (marsAngle + marsAngleSpeed * frameDiff) & 0xffff;

        var sinA = sinus[marsAngle];
        var cosA = sinus[(marsAngle + 16384) & 0xffff];
        
        marsRoverY += marsSpeed * cosA * frameDiff;
        marsRoverX -= marsSpeed * sinA * frameDiff;
        
        marsAngleSpeed = 7;
        if (marsRoverY < 20) { marsAngleSpeed = 50; marsRoverY = 20; }
        if (marsRoverX < 20) { marsAngleSpeed = 50; marsRoverX = 20; }
        if (marsRoverY > marsGridWidth - 20) { marsAngleSpeed = 50; marsRoverY = marsGridWidth - 20; }
        if (marsRoverX > marsGridWidth - 20) { marsAngleSpeed = 50; marsRoverX = marsGridWidth - 20; }
        
        var marsRoverZ = marsGetZ(marsRoverX, marsRoverY) + marsAddedZ;
        if (marsRoverZ < 0.7) marsRoverZ = 0.7;
        
        // When marsRoverZ == 0.3, the gradient starts already at 0.4 and goes to 0.7
        // When marsRoverZ == 10, the gradient starts at 1.0 and goes to 1.0
        var gradientStart = 1 - ((10 - marsRoverZ) / 9.7 * 0.6);
        if (gradientStart < 0.4) gradientStart = 0.4;
        if (gradientStart > 0.999) gradientStart = 0.999;
        var gradientEnd = (1 + gradientStart) / 2;
        
        if (marsPlanetFactor < 1) {
            var grd = context.createLinearGradient(0, 0, 0, height);
            grd.addColorStop(0, "#000000");
            grd.addColorStop(gradientStart, "#000000");
            grd.addColorStop(gradientEnd, "#443322");
            grd.addColorStop(1, "#443322");
            context.fillStyle = grd;
            context.fillRect(0, 0, width, height);
        }
        
        if (marsPlanetFactor > 0) {
            context.globalAlpha = marsPlanetFactor;
            var grd = context.createLinearGradient(0, 0, 0, height);
            grd.addColorStop(0, "#000000");
            grd.addColorStop(gradientStart, "#000033");
            grd.addColorStop(gradientEnd, "#113377");
            grd.addColorStop(1, "#113377");
            context.fillStyle = grd;
            context.fillRect(0, 0, width, height);
            context.globalAlpha = 1;
        }
        
        var roundedX = Math.round(marsRoverX);
        var roundedY = Math.round(marsRoverY);
        
        var surfaces = [];
        
        for (var xOffset = -20; xOffset <= 19; ++xOffset) {
            for (var yOffset = -20; yOffset <= 19; ++yOffset) {
                
                var cameraXDiff = (roundedX + xOffset) - marsRoverX;
                var cameraYDiff = (roundedY + yOffset) - marsRoverY;
                var distSquared = (cameraXDiff * cameraXDiff) + (cameraYDiff * cameraYDiff);
                if (distSquared < 330) {
                    var xo = cameraXDiff * cosA + cameraYDiff * sinA;
                    var yo = cameraYDiff * cosA - cameraXDiff * sinA;
                    cameraXDiff += 1.05;
                    var xo2 = cameraXDiff * cosA + cameraYDiff * sinA;
                    var yo2 = cameraYDiff * cosA - cameraXDiff * sinA;
                    cameraYDiff += 1.05;
                    var xo3 = cameraXDiff * cosA + cameraYDiff * sinA;
                    var yo3 = cameraYDiff * cosA - cameraXDiff * sinA;
                    cameraXDiff -= 1.05;
                    var xo4 = cameraXDiff * cosA + cameraYDiff * sinA;
                    var yo4 = cameraYDiff * cosA - cameraXDiff * sinA;
                    
                    if (yo >= -4 && yo2 >= -4 && yo3 >= -4 && yo4 >= -4) {
                        
                        var z1 = marsGetZFast(roundedX + xOffset, roundedY + yOffset);
                        var z2 = marsGetZFast(roundedX + xOffset + 1, roundedY + yOffset);
                        var z3 = marsGetZFast(roundedX + xOffset + 1, roundedY + yOffset + 1);
                        var z4 = marsGetZFast(roundedX + xOffset, roundedY + yOffset + 1);
                        
                        if (z1 < 0) z1 = 0;
                        if (z2 < 0) z2 = 0;
                        if (z3 < 0) z3 = 0;
                        if (z4 < 0) z4 = 0;
                        
                        var x1 = halfWidth + (xo * 90 / (5 + yo));
                        var y1 = halfHeight + 40 + ((marsRoverZ - z1) * 1000 / (5 + yo));
                        
                        var x2 = halfWidth + (xo2 * 90 / (5 + yo2));
                        var y2 = halfHeight + 40 + ((marsRoverZ - z2) * 1000 / (5 + yo2));
                        
                        var x3 = halfWidth + (xo3 * 90 / (5 + yo3));
                        var y3 = halfHeight + 40 + ((marsRoverZ - z3) * 1000 / (5 + yo3));
                        
                        var x4 = halfWidth + (xo4 * 90 / (5 + yo4));
                        var y4 = halfHeight + 40 + ((marsRoverZ - z4) * 1000 / (5 + yo4));
                        
                        surfaces.push({
                            coords: [x1,y1, x2,y2, x3,y3, x4,y4],
                            dist: yo,
                            fill: marsGetFill(marsGetZ(roundedX + xOffset + 0.5, roundedY + yOffset + 0.5), Math.sqrt(distSquared))
                        })
                    }
                }
            }
        }
        
        // TODO: Sort surfaces
        marsSortSurfaces(surfaces);
        
        for (var surface, i = 0; surface = surfaces[i++];) {
            context.beginPath();
            context.moveTo(surface.coords[0], surface.coords[1]);
            context.lineTo(surface.coords[2], surface.coords[3]);
            context.lineTo(surface.coords[4], surface.coords[5]);
            context.lineTo(surface.coords[6], surface.coords[7]);
            context.fillStyle = surface.fill;
            context.closePath();
            context.fill();
        }
    }
    
    
    
    // *** TV CUBE (episode #2)
    // 2.0: Move cube from far away to near the screen, first star field facing the viewer
    // 2.1: Keep the cube near the screen, first star field facing the viewer
    // 2.2: Rotate "downward" to show hidden line vector
    // 2.3: Keep the hidden line vector facing the viewer
    // 2.4: Rotate "right" to show rotating plane logo (vector like in enigma? bitmap? other?)
    // 2.5: Keep the rotating plane logo facing the viewer
    // 2.6: Keep the cube near the screen, accelerating the rotation vectors
    // 2.7: Keep the cube near the screen, rotate at fixed velocity
    // 2.8: Accelerate the cube position vectors
    // 2.9: Move the cube at fixed velocity
    // 2.10: Fade out
    
    // Faces: [normalOrigin, topLeft, topRight, bottomRight, bottomLeft]
    // Since this is a true cube with the center at [0, 0, 0], the normalOrigin is the same as the normalDirection
    
    // Viewer is positioned at [0, 0, 500] and looking toward [0, 0, 0]
    // Cube is positioned at [0, 0, 0] + distY * sin(cubePositionAngle), where distY is local
    
    var cubePositionAngle = 0;
    var cubePositionSpeed = 0;
    var cubeRotationX = 0;
    var cubeRotationY = 0;
    var cubeRotationSpeed = 0;
    
    var cubeFaces = [
        {
            // Face 0: front star field
            normalOrigin : [0, 0, 100],
            coords: [
                // Positiv Z, X,Y gŒr moturs
                [100, -100, 100], [-100, -100, 100], [-100, 100, 100], [100, 100, 100]
            ]
        }, {
            // Face 1: back star field
            normalOrigin : [0, 0, -100],
            coords: [
                // Negativ Z, X,Y gŒr medurs
                [-100, -100, -100], [100, -100, -100], [100, 100, -100], [-100, 100, -100]
            ]
        }, {
            // Face 2: top hidden line vector
            normalOrigin : [0, -100, 0],
            coords: [
                // Negativ Y, Z,X gŒr medurs
                [100, -100, -100], [-100, -100, -100], [-100, -100, 100], [100, -100, 100]
            ]
        }, {
            // Face 3: bottom hidden line vector
            normalOrigin : [0, 100, 0],
            coords: [
                // Positiv Y, Z,X gŒr moturs
                [-100, 100, -100], [100, 100, -100], [100, 100, 100], [-100, 100, 100]
            ]
        }, {
            // Face 4: left solid vector
            normalOrigin : [-100, 0, 0],
            coords: [
                // Negativ X, Y,Z gŒr medurs
                [-100, -100, -100], [-100, 100, -100], [-100, 100, 100], [-100, -100, 100]
            ]
        }, {
            // Face 5: right solid vector
            normalOrigin : [100, 0, 0],
            coords: [
                // Positiv X, Y,Z gŒr moturs
                [100, 100, -100], [100, -100, -100], [100, -100, 100], [100, 100, 100]
            ]
        }
    ];
    
    var cubeStarsCount = 500;
    
    var cubeStars = (function() {
        var result = [];
        
        for (var i = 0; i < cubeStarsCount; ++i) {
            result.push({
                x : rnd() * 2 - 1,
                y : rnd() * 2 - 1,
                z : rnd()* 0.5 + 0.5
            })
        }
        
        return result;
    })();
    /*
    var cubeNullRenderer = function() {};
    
    var plasmaSteps = 5;
    var plasmaSeed = 0;
    
    var cubePlasmaSquare = function(y1, z1, y2, z2, x, sinX, cosX, sinY, cosY, cubeCenterX, cubeCenterZ) {
        var red = sinus[(y1 * 152 + z1 * 391 + plasmaSeed) & 0xffff];
        var green = sinus[(y1 * 571 + z1 * 112 + plasmaSeed * 2) & 0xffff];
        var blue = sinus[(y1 * 282 + z1 * 130 + plasmaSeed * 4) & 0xffff];
        
        context.fillStyle = "rgba(" + (100*red + 100).toFixed(0) + "," + (100*green + 100).toFixed(0) + "," + (100*blue + 100).toFixed(0) + ",1)";
        
        var pt1 = cubeGetScreenCoords(cubeRotateOffsetCoord(
                   [x, y1, z1], sinX, cosX, sinY, cosY, cubeCenterX, cubeCenterZ));
        var pt2 = cubeGetScreenCoords(cubeRotateOffsetCoord(
                   [x, y2, z1], sinX, cosX, sinY, cosY, cubeCenterX, cubeCenterZ));
        var pt3 = cubeGetScreenCoords(cubeRotateOffsetCoord(
                   [x, y2, z2], sinX, cosX, sinY, cosY, cubeCenterX, cubeCenterZ));
        var pt4 = cubeGetScreenCoords(cubeRotateOffsetCoord(
                   [x, y1, z2], sinX, cosX, sinY, cosY, cubeCenterX, cubeCenterZ));
        
        context.beginPath();
        context.moveTo(pt1.x, pt1.y);
        context.lineTo(pt2.x, pt2.y);
        context.lineTo(pt3.x, pt3.y);
        context.lineTo(pt4.x, pt4.y);
        context.closePath();
        context.fill();
    };
    
    var cubePlasmaRenderer = function(normalOrigin, sinX, cosX, sinY, cosY, cubeCenterX, cubeCenterZ) {
        var currentPlasmaSteps = 20 - 15 * currentQuality;
        
        for (var x = -100; x < 100; x += currentPlasmaSteps) {
            var x2 = Math.min(100, x + currentPlasmaSteps + 0.5);
            for (var y = -100; y < 100; y += currentPlasmaSteps) {
                var y2 = Math.min(100, y + currentPlasmaSteps + 0.5);
                
                cubePlasmaSquare(x, y, x2, y2, normalOrigin[0], sinX, cosX, sinY, cosY, cubeCenterX, cubeCenterZ);
            }
        }

        plasmaSeed = (plasmaSeed + frameDiff * 573) & 0x3ffff;
    };
    */
    var logo1Coords = [
        [48,212, 49,191, 81,202, 93,195, 95,154, 75,134, 63,141, 33,84, 29,193],
        [128,205, 140,155, 162,155, 169,205, 194,150, 176,84, 160,136, 141,137, 133,82, 110,143],
        [237,209, 300,99, 243,123, 200,84]
    ];
    
    var logoAngle = 0;
    
    var cubePlainRenderer = function(normalOrigin, sinX, cosX, sinY, cosY, cubeCenterX, cubeCenterZ) {
        context.fillStyle = "#0000ff";
        for (var poly, i = 0; poly = logo1Coords[i++];) {
           context.beginPath();
            for (var j = 0; j < poly.length; j += 2) {
                var x = (poly[j] - 160) * 0.6;
                var y = (160 - poly[j + 1]) * normalOrigin[0] / 100 * -0.6;
                
                var sinA = sinus[logoAngle];
                var cosA = sinus[(logoAngle + 16384) & 0xffff];
                
                var x2 = x * cosA + y * sinA;
                var y2 = y * cosA - x * sinA;
                
                var onScreen = cubeGetScreenCoords(cubeRotateOffsetCoord(
                   [normalOrigin[0],
                    x2, y2], sinX, cosX, sinY, cosY, cubeCenterX, cubeCenterZ));
                
                if (i == 0) {
                    context.moveTo(onScreen.x, onScreen.y);
                } else {
                    context.lineTo(onScreen.x, onScreen.y);
                }
            }
            context.closePath();
            context.fill();
        }
        
        logoAngle = (logoAngle + frameDiff * 197) & 0xffff;
    };
    
    var cubeLinePoints = [
        [-40, -40, 70],
        [40, -40, 70],
        [40, 40, 70],
        [-40, 40, 70],
        [0, 0, -70]
    ];
    
    var cubeLinePolygons = [
        [0, 4, 3],
        [1, 4, 0],
        [2, 4, 1],
        [3, 4, 2],
        [3, 2, 1, 0]
    ];
    
    var cubeLineAngleX = 0;
    var cubeLineAngleY = 0;
    
    var cubeLineRenderer = function(normalOrigin, sinX, cosX, sinY, cosY, cubeCenterX, cubeCenterZ) {
        var sinLAX = sinus[cubeLineAngleX];
        var cosLAX = sinus[(cubeLineAngleX + 16384) & 0xffff];
        var sinLAY = sinus[cubeLineAngleY];
        var cosLAY = sinus[(cubeLineAngleY + 16384) & 0xffff];
        
        var screenCoords = [];
        for (var point, i = 0; point = cubeLinePoints[i++];) {
            screenCoords.push(cubeGetScreenCoords(cubeRotateOffsetCoord(
                point, sinLAX, cosLAX, sinLAY, cosLAY, 0, 0)));
        }
        
        var polygonIndices = [];
        for (var polygon, i = 0; polygon = cubeLinePolygons[i]; ++i) {
            var edgeSum = 0;
            for (var j = 0; j < polygon.length; ++j) {
                var pointIndex = polygon[j];
                var pointIndex2 = polygon[(j + 1) % polygon.length];
                
                edgeSum += (screenCoords[pointIndex2].x - screenCoords[pointIndex].x) *
                           (screenCoords[pointIndex2].y + screenCoords[pointIndex].y);
            }
            
            
            if (edgeSum < 0) {
                polygonIndices.push(i);
            }
        }
        
        context.beginPath();
        for (var i = 0; i < polygonIndices.length; ++i) {
            var polygon = cubeLinePolygons[polygonIndices[i]];
            
            for (var j = 0; j <= polygon.length; ++j) {
                var projectedPoint = screenCoords[polygon[j % polygon.length]];
                
                var realScreenCoord = cubeGetScreenCoords(cubeRotateOffsetCoord(
                    [projectedPoint.x - halfWidth, normalOrigin[1], projectedPoint.y - halfHeight],
                    sinX, cosX, sinY, cosY, cubeCenterX, cubeCenterZ));
                if (j == 0) {
                    context.moveTo(realScreenCoord.x, realScreenCoord.y);
                } else {
                    context.lineTo(realScreenCoord.x, realScreenCoord.y);
                }
            }
        }
        context.closePath();
        context.strokeStyle = "#ffffff";
        context.stroke();
    };
    
    var cubeStarRenderer = function(normalOrigin, sinX, cosX, sinY, cosY, cubeCenterX, cubeCenterZ) {
        for (var star, i = 0; (i < (cubeStarsCount * currentQuality)) && (star = cubeStars[i++]);) {
            var x = star.x + normalOrigin[0];
            var y = star.y + normalOrigin[1];
            star.x += star.z * star.z * frameDiff * 0.02;
            if (star.x > 1) star.x -= 2;
            
            var onScreen = cubeGetScreenCoords(cubeRotateOffsetCoord(
                [x * 100 + normalOrigin[0],
                 y * 100 + normalOrigin[1],
                 normalOrigin[2]], sinX, cosX, sinY, cosY, cubeCenterX, cubeCenterZ));
            
            context.fillStyle = "rgba(255,255,255," + (star.z * star.z).toFixed(3) + ")";
            context.fillRect(onScreen.x - star.z, onScreen.y - star.z, star.z * 2, star.z * 2);
        }
        
    };
    
    var cubeFaceRenderers = [
//        cubeStarRenderer, cubeStarRenderer, cubeLineRenderer, cubeLineRenderer, cubePlainRenderer, cubePlasmaRenderer
        cubeStarRenderer, cubeStarRenderer, cubeLineRenderer, cubeLineRenderer, cubePlainRenderer, cubePlainRenderer
    ];
    
    var cubeGetScreenCoords = function(coord) {
        var screenX = halfWidth + coord.x * 600 / (600 + coord.z);
        var screenY = halfHeight + coord.y * 600 / (600 + coord.z);
        return { x : screenX, y : screenY };
    };
    
    var cubeRotateOffsetCoord = function(coordArray, sinX, cosX, sinY, cosY, cubeCenterX, cubeCenterZ) {
        var x = coordArray[0];
        var y = coordArray[1];
        var z = coordArray[2];
        
        // Rotate cube around its center
        var y2 = y * cosX + z * sinX;
        var z2 = z * cosX - y * sinX;
        
        var x2 = x * cosY + z2 * sinY;
        var z3 = z2 * cosY - x * sinY;
        
        // Offset entire cube
        x2 += cubeCenterX;
        z3 += cubeCenterZ;
        
        return {x : x2, y : y2, z : z3};
    };
    
    var cubeRenderer = function(subId, chapterOffset, chapterComplete, frameDiff) {
        var smoothCC = smoothComplete(chapterComplete);
        
        context.clearRect(0, 0, width, height);
        
        var distY = subId == 0 ? 400 * smoothCC - 200 : 200;
        
        if (subId == 0) {
            context.globalAlpha = smoothCC;
        } else if (subId == 10) {
            context.globalAlpha = 1 - smoothCC;
        } else {
            context.globalAlpha = 1;
        }
        
        switch (subId) {
            case 2:
                cubeRotationX = 65536 - 16384 * smoothCC;
                break;
            case 3:
                cubeRotationX = 49152;
                break;
            case 4:
                cubeRotationY = 65536 - 16384 * smoothCC;
                break;
            case 5:
                cubeRotationY = 49152;
                break;
            case 6:
                cubeRotationSpeed = smoothCC;
                break;
            case 7:
                cubeRotationSpeed = 1;
                break;
            case 8:
                cubePositionSpeed = smoothCC;
                break;
            case 9:
                cubePositionSpeed = 1;
        }
        
        cubeRotationX = (cubeRotationX + frameDiff * cubeRotationSpeed * 157) & 0xffff;
        cubeRotationY = (cubeRotationY + frameDiff * cubeRotationSpeed * 173) & 0xffff;
        cubePositionAngle = (cubePositionAngle + frameDiff * cubePositionSpeed * 197) & 0xffff;
        cubeLineAngleX = (cubeLineAngleX + frameDiff * 217) & 0xffff;
        cubeLineAngleY = (cubeLineAngleY + frameDiff * 181) & 0xffff;
        
        var cubeCenterZ = -distY * sinus[(cubePositionAngle + 16384) & 0xffff];
        var cubeCenterX = distY * sinus[cubePositionAngle];
        
        var cosX = sinus[(cubeRotationX + 16384) & 0xffff]; // Math.cos(this.starRotation);
        var sinX = sinus[cubeRotationX & 0xffff]; // Math.sin(this.starRotation);
        var cosY = sinus[(cubeRotationY + 16384) & 0xffff]; // Math.cos(this.starRotation);
        var sinY = sinus[cubeRotationY & 0xffff]; // Math.sin(this.starRotation);
        
        for (var face, i = 0; face = cubeFaces[i++];) {
            var screenCoords = [];
            for (var j = 0; j <= 3; ++j) {
                var coord = face.coords[j % 4];
                coord = cubeRotateOffsetCoord(coord, sinX, cosX, sinY, cosY, cubeCenterX, cubeCenterZ);
                var screenPos = cubeGetScreenCoords(coord);
                screenCoords[j] = screenPos;
            }
            
            var edgeSum = 0;
            for (var j = 0; j <= 3; ++j) {
                edgeSum += (screenCoords[(j + 1) % 4].x - screenCoords[j].x) *
                           (screenCoords[(j + 1) % 4].y + screenCoords[j].y);
            }
            
            if (edgeSum < 0) {
                context.beginPath();
                for (var j = 0; j <= 4; ++j) {
                    var screenPos = screenCoords[j % 4];
                    
                    if (j == 0) {
                        context.moveTo(screenPos.x, screenPos.y);
                    } else {
                        context.lineTo(screenPos.x, screenPos.y);
                    }
                }
                context.closePath();
                context.strokeStyle = "#0000ff";
                context.stroke();
                
                var faceRenderer = cubeFaceRenderers[i-1];
                faceRenderer(face.normalOrigin, sinX, cosX, sinY, cosY, cubeCenterX, cubeCenterZ);
            }
        }
    };
    
    
    
    
    // *** BLOCK LOGO (episode #1)
    
    var blockLogoCoords = [
        // E
        [2,95, 33,95, 33,58, 62,58, 62,40, 33,40, 33,2, 2,2],
        [38,95, 86,95, 86,68, 57,68, 57,77, 38,77],
        [38,20, 57,20, 57,29, 86,29, 86,2, 38,2],
        // N
        [101,86, 128,42, 128,2, 101,2],
        [101,95, 134,95, 190,2, 157,2],
        [163,95, 190,95, 190,11, 163,55],
        // I
        [206,95, 255,95, 255,75, 246,75, 246,22, 255,22, 255,2, 206,2, 206,22, 215,22, 215,75, 206,75],
        // G
        [288,95, 300,95, 300,20, 327,20, 327,2, 288,2, 270,20, 270,77],
        [306,95, 344,95, 359,77, 359,67, 329,67, 329,77, 306,77],
        [318,53, 359,53, 359,2, 332,2, 332,35, 318,35],
        // M
        [375,86, 403,38, 403,2, 375,2],
        [375,95, 408,95, 433,53, 452,87, 452,40, 430,2],
        [457,95, 488,95, 488,2, 457,2],
        // A
        [497,2, 530.5,90, 544,54, 527,2],
        [534,95, 564,95, 601,2, 570,2, 566,12, 536,12, 542,30, 559,30],
        // T (minska med 3 hŠrifrŒn och framŒt)
        [605-8,95, 686-8,95, 686-8,75, 605-8,76],
        [630-8,70, 661-8,70, 661-8,2, 630-8,2],
        // I
        [697-8,95, 746-8,95, 746-8,75, 737-8,75, 737-8,22, 746-8,22, 746-8,2, 697-8,2, 697-8,22, 706-8,22, 706-8,75, 697-8,75],
        // C
        [778-8,95, 790-8,95, 790-8,2, 778-8,2, 760-8,20, 760-8,77],
        [796-8,95, 829-8,95, 847-8,76, 847-8,58, 816-8,58, 816-8,77, 796-8,77],
        [796-8,20, 816-8,20, 816-8,39, 847-8,39, 847-8,19, 829-8,2, 796-8,2]
    ];
    
    var blockLogoTransform = function(subId, index, complete, smooth, x, y) {
        var xOffset = x - (851/2);
        var yOffset = (97/2) - y;
        
        switch (subId) {
            case 0:
                return { x : 320 + smooth * xOffset * 0.7, y : 256 + smooth * yOffset * 0.7 };
            case 1:
                var z = 100 - yOffset / 20 - xOffset / 40;
                var newXOffset = xOffset * (0.7 * 100 / z);
                var newYOffset = yOffset * (0.7 * 100 / z);
                var xx = (xOffset * 0.7 * (1 - smooth)) + (newXOffset * smooth);
                var yy = (yOffset * 0.7 * (1 - smooth)) + (newYOffset * smooth);
                return { x : 320 + xx, y : 256 + yy };
            case 2:
                var oldZ = 100 - yOffset / 20 - xOffset / 40;
                var newZ = 100 + xOffset / 30 - yOffset / 25;
                var z = oldZ * (1 - smooth) + newZ * smooth;
                var newXOffset = xOffset * (0.7 * 100 / z);
                var newYOffset = yOffset * (0.7 * 100 / z);
                return { x : 320 + newXOffset, y : 256 + newYOffset };
            case 3:
                var z = 100 + xOffset / 30 - yOffset / 25;
                var newXOffset = xOffset * (0.7 * 100 / z);
                var newYOffset = yOffset * (0.7 * 100 / z);
                return { x : 320 + newXOffset * (1 - smooth), y : 256 + newYOffset * (1 - smooth) };
            default:
                return { x : 320 + xOffset, y : 256 + yOffset };
        }
    };
    
    var blockLogoMove = function(subId, index, offset, smooth, x, y, xOffset, yOffset) {
        var coords = blockLogoTransform(subId, index, offset, smooth, x, y);
        context.moveTo(coords.x + xOffset, coords.y + yOffset);
    };
    
    var blockLogoLine = function(subId, index, offset, smooth, x, y, xOffset, yOffset) {
        var coords = blockLogoTransform(subId, index, offset, smooth, x, y);
        context.lineTo(coords.x + xOffset, coords.y + yOffset);
    }
    
    var blockLogoRenderer = function(subId, chapterOffset, chapterComplete, frameDiff) {
        var smoothCC = smoothComplete(chapterComplete);
        
        context.clearRect(0, 0, width, height);
        
        var xOffset = 0;
        var yOffset = 0;
        
        if (subId == 1) {
            xOffset = smoothCC * -5;
            yOffset = smoothCC * -9;
        } else if (subId == 2) {
            xOffset = 11 * smoothCC - 5;
            yOffset = 2 * smoothCC - 9;
        } else if (subId == 3) {
            xOffset = 6 * (1 - smoothCC);
            yOffset = -7 * (1 - smoothCC);
        }
        
        context.fillStyle = "rgba(255,51,153,0.1)";
        context.strokeStyle = "rgba(255,255,255,0.1)";

        // Bottom surfaces
        context.beginPath();
        for (var block, blockIndex = 0; block = blockLogoCoords[blockIndex++];) {
            blockLogoMove(subId, blockIndex, chapterComplete, smoothCC, block[0], block[1], 0, 0);
            
            for (var i = 2; i < block.length; i += 2) {
                blockLogoLine(subId, blockIndex, chapterComplete, smoothCC, block[i], block[i+1], 0, 0);
            }
            blockLogoLine(subId, blockIndex, chapterComplete, smoothCC, block[0], block[1], 0, 0);
        }
        context.closePath();
        context.fill();
        
        context.fillStyle = "rgba(255,51,153,0.3)";
        // Side surfaces
        for (var block, blockIndex = 0; block = blockLogoCoords[blockIndex++];) {
            var length = block.length;
            for (var i = 0; i < length; i += 2) {
                context.beginPath();
                blockLogoMove(subId, blockIndex, chapterComplete, smoothCC, block[i], block[i+1], 0, 0);
                blockLogoLine(subId, blockIndex, chapterComplete, smoothCC, block[(i + 2) % length], block[(i + 3) % length], 0, 0);
                blockLogoLine(subId, blockIndex, chapterComplete, smoothCC, block[(i + 2) % length], block[(i + 3) % length], xOffset, yOffset);
                blockLogoLine(subId, blockIndex, chapterComplete, smoothCC, block[i], block[i+1], xOffset, yOffset);
                blockLogoLine(subId, blockIndex, chapterComplete, smoothCC, block[i], block[i+1], 0, 0);
                context.closePath();
                context.fill();
                context.stroke();
            }
        }
        
        context.fillStyle = "rgba(153,51,255,0.2)";
        // Top surfaces
        context.beginPath();
        for (var block, blockIndex = 0; block = blockLogoCoords[blockIndex++];) {
            blockLogoMove(subId, blockIndex, chapterComplete, smoothCC, block[0], block[1], xOffset, yOffset);
            
            for (var i = 2; i < block.length; i += 2) {
                blockLogoLine(subId, blockIndex, chapterComplete, smoothCC, block[i], block[i+1], xOffset, yOffset);
            }
            blockLogoLine(subId, blockIndex, chapterComplete, smoothCC, block[0], block[1], xOffset, yOffset);
        }
        context.closePath();
        context.fill();
        context.stroke();
    };
    
    
    
    
    
    // *** STAR FIELD (episode #0)
    
    var maxStarCount = 3000;
    var starCount = maxStarCount;
    
    var starFieldRenderer = function(subId, chapterOffset, chapterComplete, frameDiff) {
        var sp = starPositions;
        var smoothCC = smoothComplete(chapterComplete);
        
        context.clearRect(0, 0, width, height);
        
        switch (subId) {
            case 1:
                starRotationY = 16384 * smoothComplete(chapterComplete);
                break;
            case 2:
                starRotationY = 16384;
                break;
            case 3:
                starRotationY = (starRotationY + frameDiff * smoothCC * starRotationYSpeed);
                starRotationX = (starRotationX + frameDiff * smoothCC * starRotationXSpeed);
                break;
            case 4:
                starRotationY = (starRotationY + frameDiff * starRotationYSpeed);
                starRotationX = (starRotationX + frameDiff * starRotationXSpeed);
                break;
            case 5:
                starRotationY = (starRotationY + frameDiff * (1 - smoothCC) * starRotationYSpeed);
                starRotationX = (starRotationX + frameDiff * (1 - smoothCC) * starRotationXSpeed);
                break;
            case 7:
                starRotationY = 16384;
                starRotationX = 0;
                starOffsetXSpeed = 0.01 + 0.08 * chapterComplete;
                break;
        }
        
        var a = starRotationY;
        var b = starRotationX;
        
        if (subId == 6) {
            var targetRotationY = 16384, targetRotationX = 0;
            while (a > targetRotationY + 32768) targetRotationY += 65536;
            while (b > targetRotationX + 32768) targetRotationX += 65536;
            a = (a * (1 - smoothCC)) + targetRotationY * smoothCC;
            b = (b * (1 - smoothCC)) + targetRotationX * smoothCC;
        }
        
        a &= 0xffff;
        b &= 0xffff;
        
        starOffsetX += (frameDiff * starOffsetXSpeed);
        while (starOffsetX >= 2.0) starOffsetX -= 2.0;
        var offX = starOffsetX;
        context.fillStyle = "#ffffff";
        
        for (var i = 0; i < starCount * currentQuality; ++i) {
            var star = sp[i];
            
            var sx = star.x + offX;
            while (sx > 1.0) sx -= 2.0;
            while (sx < -1.0) sx += 2.0;
            var sy = star.y;
            var sz = star.z;
            var cosA = sinus[(a + 16384) & 0xffff]; // Math.cos(this.starRotation);
            var sinA = sinus[a & 0xffff]; // Math.sin(this.starRotation);
            var cosB = sinus[(b + 16384) & 0xffff]; // Math.cos(this.starRotation);
            var sinB = sinus[b & 0xffff]; // Math.sin(this.starRotation);
            
            var sx2 = sx * cosA + sz * sinA;
            var sz2 = sz * cosA - sx * sinA;
            
            var sy2 = sy * cosB + sz2 * sinB;
            var sz3 = sz2 * cosB - sy * sinB;
            
            var x = sx2 * 2 / (2 + sz3) * largestHalf + halfWidth;
            var y = sy2 * 2 / (2 + sz3) * largestHalf + halfHeight;
            
            if (subId == -1) {
                context.globalAlpha = (0.6 - sz3 * 0.4) * smoothCC;
            } else if (subId == 7) {
                context.globalAlpha = (0.6 - sz3 * 0.4) * (1 - smoothCC);
            } else {
                context.globalAlpha = (0.6 - sz3 * 0.4);
            }
            context.fillRect(x, y, 2 - sz3, 2 - sz3);
        }
    };
    
    var renderers = [
            starFieldRenderer,
            blockLogoRenderer,
            cubeRenderer,
            marsRenderer,
            ballsRenderer
        ],
        
        texts = [
            {
                mode : 1,
                from : 1000,
                to : 6000,
                text : "LBRTW gives you...",
                y : 256,
                font : 48
            }, {
                mode : 1,
                from : 6300,
                to : 14000,
                text : "A Canvas Hack",
                y : 166,
                font : 28
            }, {
                mode : 1,
                from : 6700,
                to : 14500,
                text : "Inspired by",
                y : 200,
                font : 40
            }, {
                mode : 1,
                from : 7100,
                to : 15500,
                text : "The 1991 Amiga demo",
                y : 250,
                font : 36
            }, {
                mode : 1,
                from : 7100,
                to : 17000,
                text : "Enigma",
                y : 300,
                font : 64
            }, {
                mode : 1,
                from : 19000,
                to : 23000,
                text : "Music",
                y : 192,
                font : 32
            }, {
                mode : 1,
                from : 19500,
                to : 25000,
                text : "Jimmy Fredriksson (Firefox)",
                y : 232,
                font : 39
            }, {
                mode : 1,
                from : 19500,
                to : 25000,
                text : "Robert \xd6sterbergh (Tip)",
                y : 280,
                font : 39
            }, {
                mode : 1,
                from : 20000,
                to : 24000,
                text : "(shamelessly ripped)",
                y : 316,
                font : 24
            }, {
                mode : 1,
                from : 26000,
                to : 30000,
                text : "Programming",
                y : 216,
                font : 32
            }, {
                mode : 1,
                from : 26500,
                to : 32000,
                text : "Anders Tornblad",
                y : 256,
                font : 48
            }, {
                mode : 1,
                from : 27000,
                to : 31000,
                text : "(JavaScript, Algorithms, Math and stuff)",
                y : 292,
                font : 24
            }, {
                mode : 1,
                from : 32000,
                to : 36000,
                text : "One hundred percent",
                y : 216,
                font : 32
            }, {
                mode : 1,
                from : 32500,
                to : 38000,
                text : "Flash-free",
                y : 256,
                font : 48
            }, {
                mode : 1,
                from : 33000,
                to : 37000,
                text : "(No Silverlight or Java either)",
                y : 292,
                font : 24
            }, {
                mode : 1,
                from : 38000,
                to : 45000,
                text : "Tested on",
                y : 104,
                font : 32
            }, {
                mode : 1,
                from : 38500,
                to : 45500,
                text : "Chrome, FireFox",
                y : 144,
                font : 48
            }, {
                mode : 1,
                from : 39000,
                to : 46000,
                text : "Safari, IE9, IE10",
                y : 192,
                font : 48
            }, {
                mode : 1,
                from : 39500,
                to : 46500,
                text : "iPhone, iPad",
                y : 240,
                font : 48
            }, {
                mode : 1,
                from : 40000,
                to : 47000,
                text : "Android devices",
                y : 288,
                font : 48
            }, {
                mode : 1,
                from : 40500,
                to : 47500,
                text : "Windows Phone",
                y : 336,
                font : 48
            }, {
                mode : 1,
                from : 41000,
                to : 48000,
                text : "Samsung Smart TV",
                y : 376,
                font : 32
            }, {
                mode : 2,
                from : 43500,
                to : 48500,
                text : "Yes, really!",
                y : 400,
                font : 16
            }, {
                mode : 3,
                from : 50000,
                to : 68000,
                text : "There are no bitmap images used in this demo",
                y : 512-60,
                font : 32
            }, {
                mode : 1,
                from : 70000,
                to : 80000,
                text : "Star field",
                y : 60,
                font : 40
            }, {
                mode : 1,
                from : 78000,
                to : 88000,
                text : "Hidden line vector",
                y : 60,
                font : 40
            }, {
                mode : 1,
                from : 86000,
                to : 96000,
                text : "Old-school plane vector",
                y : 60,
                font : 40
            }, {
                mode : 3,
                from : 100000,
                to : 106000,
                text : "This demo has an adaptive mechanism.",
                y : 512-60,
                font : 32
            }, {
                mode : 3,
                from : 105000,
                to : 120000,
                text : "The number of stars and surfaces are automatically limited to an amount that your computer and browser can handle.",
                y : 512-60,
                font : 32
            }, {
                mode : 1,
                from : 128000,
                to : 135000,
                text : "Welcome to Mars",
                y : 200,
                font : 40
            }, {
                mode : 1,
                from : 145000,
                to : 153000,
                text : "Fun fact:",
                y : 200,
                font : 40
            }, {
                mode : 1,
                from : 145500,
                to : 153500,
                text : "This is a fractal landscape",
                y : 236,
                font : 32
            }, {
                mode : 1,
                from : 146000,
                to : 154000,
                text : "with random seeds, so it will",
                y : 268,
                font : 32
            }, {
                mode : 1,
                from : 146500,
                to : 154500,
                text : "look different each time",
                y : 300,
                font : 32
            }, {
                mode : 1,
                from : 165000,
                to : 173000,
                text : "Fun fact:",
                y : 200,
                font : 40
            }, {
                mode : 1,
                from : 165500,
                to : 173500,
                text : "Marsian gravity is only 38%",
                y : 236,
                font : 32
            }, {
                mode : 1,
                from : 166000,
                to : 174000,
                text : "of Earth's, so I would feel",
                y : 268,
                font : 32
            }, {
                mode : 1,
                from : 166500,
                to : 174500,
                text : "like only 30kg (70lb) there",
                y : 300,
                font : 32
            }, {
                mode : 1,
                from : 179000,
                to : 188000,
                text : "Terraforming...",
                y : 200,
                font : 40
            }, {
                mode : 1,
                from : 195000,
                to : 203000,
                text : "Fun fact:",
                y : 200,
                font : 40
            }, {
                mode : 1,
                from : 195500,
                to : 203500,
                text : "The Mars scene in Enigma was",
                y : 236,
                font : 32
            }, {
                mode : 1,
                from : 196000,
                to : 204000,
                text : "truly groundbreaking. I'm sorry,",
                y : 268,
                font : 32
            }, {
                mode : 1,
                from : 196500,
                to : 204500,
                text : "but there are no choppers or",
                y : 300,
                font : 32
            }, {
                mode : 1,
                from : 197000,
                to : 205000,
                text : "cool buildings in this version.",
                y : 332,
                font : 32
            }, {
                mode : 3,
                from : 200000,
                to : 220000,
                text : "Do you want to know how this was made? Go to lbrtw.com to read all about it.",
                y : 30,
                font : 32
            }, {
                mode : 3,
                from : 218000,
                to : 237000,
                text : "The raytracer scene from the original Enigma demo is not in here at all.",
                y : 30,
                font : 32
            }, {
                mode : 3,
                from : 235000,
                to : 255000,
                text : "Neither are the various balls, but there will be one nice glenz ball for you.",
                y : 30,
                font : 32
            }, {
                mode : 3,
                from : 260000,
                to : 280000,
                text : "This is the end of the \"Phenomenal & Enigmatic\" JavaScript demo by Anders Tornblad",
                y : 30,
                font : 32
            }, {
                mode : 3,
                from : 275000,
                to : 288000,
                text : "I hope you have enjoyed it. I enjoyed making it.",
                y : 30,
                font : 32
            }, {
                mode : 1,
                from : 285000,
                to : 330000,
                text : "The End",
                y : 256,
                font : 64
            }
        ],
        
        chapters = [
            {
                from : 0,
                to : 2000,
                rendererIndex : 0,
                subId : -1
            }, {
                from : 2000,
                to : 4000,
                rendererIndex : 0,
                subId : 0
            }, {
                from : 4000,
                to : 7000,
                rendererIndex : 0,
                subId : 1
            }, {
                from : 7000,
                to : 11000,
                rendererIndex : 0,
                subId : 2
            }, {
                from : 11000,
                to : 13000,
                rendererIndex : 0,
                subId : 3
            }, {
                from : 13000,
                to : 42000,
                rendererIndex : 0,
                subId : 4
            }, {
                from : 42000,
                to : 45000,
                rendererIndex : 0,
                subId : 5
            }, {
                from : 45000,
                to : 48000,
                rendererIndex : 0,
                subId : 6
            }, {
                from : 48000,
                to : 50000,
                rendererIndex : 0,
                subId : 7
            }, {
                from : 50000,
                to : 54000,
                rendererIndex : 1,
                subId : 0
            }, {
                from : 54000,
                to : 58000,
                rendererIndex : 1,
                subId : 1
            }, {
                from : 58000,
                to : 64000,
                rendererIndex : 1,
                subId : 2
            }, {
                from : 64000,
                to : 68000,
                rendererIndex : 1,
                subId : 3
            }, {
                from : 68000,
                to : 72000,
                rendererIndex : 2,
                subId : 0
            }, {
                from : 72000,
                to : 78000,
                rendererIndex : 2,
                subId : 1
            }, {
                from : 78000,
                to : 80000,
                rendererIndex : 2,
                subId : 2
            }, {
                from : 80000,
                to : 86000,
                rendererIndex : 2,
                subId : 3
            }, {
                from : 86000,
                to : 88000,
                rendererIndex : 2,
                subId : 4
            }, {
                from : 88000,
                to : 95500,
                rendererIndex : 2,
                subId : 5
            }, {
                from : 95500,
                to : 97500,
                rendererIndex : 2,
                subId : 6
            }, {
                from : 97500,
                to : 106000,
                rendererIndex : 2,
                subId : 7
            }, {
                from : 106000,
                to : 108000,
                rendererIndex : 2,
                subId : 8
            }, {
                from : 108000,
                to : 122000,
                rendererIndex : 2,
                subId : 9
            }, {
                from : 122000,
                to : 126000,
                rendererIndex : 2,
                subId : 10
            }, {
                from : 126000,
                to : 130500,
                rendererIndex : 3,
                subId : 0
            }, {
                from : 130500,
                to : 180000,
                rendererIndex : 3,
                subId : 1
            }, {
                from : 180000,
                to : 193000,
                rendererIndex : 3,
                subId : 2
            }, {
                from : 193000,
                to : 255000,
                rendererIndex : 3,
                subId : 3
            }, {
                from : 255000,
                to : 260000,
                rendererIndex : 3,
                subId : 4
            }, {
                from : 260000,
                to : 264000,
                rendererIndex : 4,
                subId : 0
            }, {
                from : 264000,
                to : (5 * 60 + 33) * 1000 * 2,
                rendererIndex : 4,
                subId : 1
            },
            false
        ],
        
        preCalcRandomStarPositions = function() {
            var pos = [];
            
            for (var i = 0; i < maxStarCount; ++i) {
                pos.push({
                    x : rnd() * 2 - 1,
                    y : rnd() * 2 - 1,
                    z : rnd() * 2 - 1
                });
            }
            
            starPositions = pos;
            starRotationY = 0;
            starRotationX = 0;
            starOffsetX = 0;
            starRotationYSpeed = 137;
            starRotationXSpeed = 79;
            starOffsetXSpeed = 0.01;
            currentQuality = 1;
        },
        
        preCalcSinusTables = function() {
            var sin = [];
            var pi = 4 * Math.atan(1);
            
            for (var i = 0; i <= 65535; ++i) {
                var value = Math.sin(i * pi / 32768);
                sin.push(value);
            }
            
            sinus = sin;
        },
        
        preCalc = function() {
            preCalcRandomStarPositions();
            preCalcSinusTables();
        },
        
        renderText = function(textObj, timeOffset) {
            var fromStart = timeOffset - textObj.from;
            
            context.font = textObj.font + "px 'Bowlby One SC'";
            context.fillStyle = "#0000ff";
            context.textBaseline = "middle";
            
            if (textObj.mode <= 2) {
                var toEnd = textObj.to - timeOffset;
                var alpha = 1;
                if (fromStart < 2000) alpha = fromStart / 2000;
                if (toEnd < 2000) alpha = toEnd / 2000;
                
                context.globalAlpha = alpha;
                context.textAlign = textObj.mode == 1 ? "center" : "left";
                context.fillText(textObj.text, 320, textObj.y);
            } else if (textObj.mode == 3) {
                var ratio = fromStart / (textObj.to - textObj.from);
                if (!textObj.width) {
                    textObj.width = context.measureText(textObj.text).width;
                }
                var endLeft = -textObj.width;
                var startLeft = width;
                var x = startLeft + (endLeft - startLeft) * ratio;
                context.globalAlpha = 1;
                context.textAlign = "left";
                context.fillText(textObj.text, x, textObj.y);
            }
        },
        
        animFrame = function(time) {
            if (startTime) {
                frameDiff = (time - lastTime) / 1000 * 60;
                
                timeOffset = time - startTime;
                
                var currentChapter = chapters[currentChapterIndex];
                if (currentChapter && (timeOffset >= currentChapter.to)) {
                    ++currentChapterIndex;
                    currentChapter = chapters[currentChapterIndex];
                }
                
                if (currentChapter) {
                    var chapterTime = timeOffset - currentChapter.from;
                    var chapterComplete = chapterTime / (currentChapter.to - currentChapter.from);
                    currentRenderer = renderers[currentChapter.rendererIndex];
                    
                    var starting = now();
                    context.globalAlpha = 1;
                    context.save();
                    currentRenderer.call(this, currentChapter.subId, chapterTime, chapterComplete, frameDiff);
                    context.restore();
                    context.save();
                    for (var i = 0, textObj; textObj = texts[i++]; ) {
                        if (textObj.from <= timeOffset && textObj.to > timeOffset) {
                            renderText(textObj, timeOffset);
                        }
                    }
                    context.restore();
                }
                
                var ended = now();
                var ms = ended - starting;
                var qualityStep = (22 - ms - 10 * frameDiff) / 200;
                if (qualityStep > 0) {
                    qualityStep *= 0.005;
                }
                var newQuality = currentQuality + qualityStep;
                if (newQuality > 1) {
                    newQuality = 1;
                } else if (newQuality < 0.1) {
                    newQuality = 0.1;
                }
                currentQuality = newQuality;
                
                if (dev) {
                    context.fillStyle = "#ffffff";
                    context.font = "10px Helvetica";
                    context.textAlign = "left";
                    context.textBaseline = "top";
                    context.fillText(timeOffset.toFixed(2), 0, 0);
                }
            }
            
            if (currentTime) {
                if (!lastTime) {
                    startTime = time - 1000 * currentTime;
                }
                lastTime = time;
            }
            
            if (playing) {
                requestAnimationFrame(animFrame);
            }
        },
        
        onplay = function() {
            playing = true;
            requestAnimationFrame(animFrame);
            document.getElementById("pressPlay").style.display = "none";
            if (!dev) {
                mod.style.position = "absolute";
                mod.style.left = "-1000px";
                mod.style.top = "-1000px";
            }
        },
        
        ontimeupdate = function(e) {
            currentTime = musiklinjen.currentTime;
        },
        
        onload = function() {
            canvas = document.getElementById("demo");
            context = canvas.getContext("2d");
            mod = document.getElementById("mod");
            musiklinjen = document.getElementById("musiklinjen");
            playing = false;
            musiklinjen.addEventListener("play", onplay, false);
            musiklinjen.addEventListener("timeupdate", ontimeupdate, false);
            preCalc();
            if (!dev) {
                musiklinjen.play(); // Un-comment this when it's all done!
            }
        };
    
    window.onload = onload;
})();
