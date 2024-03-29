var IMAGE_WIDTH  = 256
var IMAGE_HEIGHT = 256
var NSUBSAMPLES  = 1
var NAO_SAMPLES  = 8

function vec(x, y, z)
{
    this.x = x;
    this.y = y;
    this.z = z;
}

function vadd(a, b)
{
    return new vec(a.x + b.x, a.y + b.y, a.z + b.z);
}

function vsub(a, b)
{
    return new vec(a.x - b.x, a.y - b.y, a.z - b.z);
}

function vcross(a, b)
{
    return new vec(a.y * b.z - a.z * b.y,
                   a.z * b.x - a.x * b.z,
                   a.x * b.y - a.y * b.x);
}

function vdot(a, b)
{
    return (a.x * b.x + a.y * b.y + a.z * b.z);
}

function vlength(a)
{
    return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

function vnormalize(a)
{
    var len = vlength(a);
    var v = new vec(a.x, a.y, a.z);

    if (Math.abs(len) > 1.0e-17) {
        v.x /= len;
        v.y /= len;
        v.z /= len;
    }

    return v;
}

function Sphere(center, radius)
{
    this.center = center;
    this.radius = radius;

    this.intersect = function (ray, isect) {
        // rs = ray.org - sphere.center
        var rs  = vsub(ray.org, this.center);
        var B = vdot(rs, ray.dir);
        var C = vdot(rs, rs) - (this.radius * this.radius);
        var D = B * B - C;

        if (D > 0.0) {
            var t = -B - Math.sqrt(D);

            if ( (t > 0.0) && (t < isect.t) ) {
                isect.t   = t;
                isect.hit = true;

                isect.p = new vec(ray.org.x + ray.dir.x * t,
                                  ray.org.y + ray.dir.y * t,
                                  ray.org.z + ray.dir.z * t);

                // calculate normal.
                var n = vsub(isect.p, this.center);
                isect.n = vnormalize(n);

            }
        }
    }
}

function Plane(p, n)
{
    this.p = p;
    this.n = n;

    this.intersect = function (ray, isect) {
        var d = -vdot(this.p, this.n);
        var v = vdot(ray.dir, this.n);

        if (Math.abs(v) < 1.0e-17) return;      // no hit

        var t = -(vdot(ray.org, n) + d) / v;

        if ( (t > 0.0) && (t < isect.t) ) {
            isect.hit = true;
            isect.t   = t;
            isect.n   = this.n;
            isect.p   = new vec( ray.org.x + t * ray.dir.x,
                                 ray.org.y + t * ray.dir.y,
                                 ray.org.z + t * ray.dir.z );
        }
    }
}

function Ray(org, dir)
{
    this.org = org;
    this.dir = dir;
}

function Isect()
{
    this.t   = 1000000.0;     // far away
    this.hit = false;
    this.p   = new vec(0.0, 0.0, 0.0);
    this.n   = new vec(0.0, 0.0, 0.0);
}

function clamp(f)
{
    
    i = f * 255.5;
    if (i > 255.0) i = 255.0;
    if (i < 0.0) i = 0.0;
    return Math.round(i);
}

function orthoBasis(basis, n)
{
    basis[2] = new vec(n.x, n.y, n.z)
    basis[1] = new vec(0.0, 0.0, 0.0)

    if ((n.x < 0.6) && (n.x > -0.6)) {
        basis[1].x = 1.0;
    } else if ((n.y < 0.6) && (n.y > -0.6)) {
        basis[1].y = 1.0;
    } else if ((n.z < 0.6) && (n.z > -0.6)) {
        basis[1].z = 1.0;
    } else {
        basis[1].x = 1.0;
    }

    basis[0] = vcross(basis[1], basis[2]);
    basis[0] = vnormalize(basis[0]);

    basis[1] = vcross(basis[2], basis[0]);
    basis[1] = vnormalize(basis[1]);
}

var spheres = Array(3);
var plane;

function init_scene(index)
{
    var radius     = 2.0;
    var steps      = 30.0;  // steps for a full circle
    var xc0        = 0.0;
    var zc0        = -3.0;

    var xd  = Math.cos(2*index*Math.PI/steps)*radius
    var zd  = Math.sin(2*index*Math.PI/steps)*radius;
    var xc1 = xc0 + xd;
    var zc1 = zc0 + zd;
    var xc2 = xc0 - xd;
    var zc2 = zc0 - zd;

    spheres[0] = new Sphere(new vec(xc1, 0.0, zc1), 0.5);
    spheres[1] = new Sphere(new vec(xc0, 0.0, zc0), 0.5);
    spheres[2] = new Sphere(new vec(xc2, 0.0, zc2), 0.5);
//    spheres[0] = new Sphere(new vec(-2.0, 0.0, -3.5), 0.5);
//    spheres[1] = new Sphere(new vec(-0.5, 0.0, -3.0), 0.5);
//    spheres[2] = new Sphere(new vec(1.0, 0.0, -2.2), 0.5);
    plane  = new Plane(new vec(0.0, -0.5, 0.0), new vec(0.0, 1.0, 0.0));
}


function ambient_occlusion(isect)
{
    var basis = new Array(3);
    orthoBasis(basis,  isect.n);

    var ntheta    = NAO_SAMPLES;
    var nphi      = NAO_SAMPLES;
    var eps       = 0.0001;
    var occlusion = 0.0;

    var p = new vec(isect.p.x + eps * isect.n.x,
                    isect.p.y + eps * isect.n.y,
                    isect.p.z + eps * isect.n.z);

    for (var j = 0; j < nphi; j++) {
        for (var i = 0; i < ntheta; i++) {
            var r = Math.random();
            var phi = 2.0 * Math.PI * Math.random();

            var x = Math.cos(phi) * Math.sqrt(1.0 - r);
            var y = Math.sin(phi) * Math.sqrt(1.0 - r);
            var z = Math.sqrt(r);

            // local -> global
            var rx = x * basis[0].x + y * basis[1].x + z * basis[2].x;
            var ry = x * basis[0].y + y * basis[1].y + z * basis[2].y;
            var rz = x * basis[0].z + y * basis[1].z + z * basis[2].z;

            var raydir = new vec(rx, ry, rz);
            var ray = new Ray(p, raydir);

            var occIsect = new Isect();
            spheres[0].intersect(ray, occIsect);
            spheres[1].intersect(ray, occIsect);
            spheres[2].intersect(ray, occIsect);
            plane.intersect(ray, occIsect);

            if (occIsect.hit) occlusion += 1.0;
        }
    }
    
    // [0.0, 1.0]
    occlusion = (ntheta * nphi - occlusion) / (ntheta * nphi);
    return occlusion;

//    return new vec(occlusion, occlusion, occlusion);
}


function render(ctx, w, h, nsubsamples)
{
    var cnt = 0;
    for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {

//            var rad = new vec(0.0, 0.0, 0.0);
            var rad1 = 0.0;

            // subsampling
            for (var v = 0; v < nsubsamples; v++) {
                for (var u = 0; u < nsubsamples; u++) {

                    cnt++;
                    var px = (x + (u / nsubsamples) - (w / 2.0))/(w / 2.0);
                    var py = -(y + (v / nsubsamples) - (h / 2.0))/(h / 2.0);

                    var eye = vnormalize(new vec(px, py, -1.0));

                    var ray = new Ray(new vec(0.0, 0.0, 0.0), eye);

                    var isect = new Isect();
                    spheres[0].intersect(ray, isect);
                    spheres[1].intersect(ray, isect);
                    spheres[2].intersect(ray, isect);
                    plane.intersect(ray, isect);

                    if (isect.hit) {
                        col = ambient_occlusion(isect);
                        rad1 += col;
                    }
                }
            }

            var g = rad1/(nsubsamples * nsubsamples);

            // use fill rect to set a pixel
            ctx.fillStyle = "rgb(" + clamp(g) + "," + clamp(g) + "," + clamp(g) + ")";
            ctx.fillRect (x, y, 1, 1);
        }
    }

}

var animate = false;

function doAnimate() {

  var canvas     = document.getElementById("box");
  var ctx        = canvas.getContext("2d");
  var frameCount = 0;

  function renderOne() {
    if (animate) {
      setTimeout(renderOne, 1);
    }
    init_scene(frameCount);
    var start = Date.now();
    render(ctx, IMAGE_WIDTH, IMAGE_HEIGHT, NSUBSAMPLES);
    var stop = Date.now();
    var fps = 1000/(stop-start);
    frameCount++;
    $("#fps").text(fps.toFixed(4));
  }

  pixel = ctx.createImageData(1,1);
  pixelData = pixel.data;
  pixelData[3] = 255;
  renderOne();
}
  
function startClick() {
  if (!animate) {
    animate = true;
    $("#start").val("Stop");
    setTimeout(doAnimate, 100);
  }
  else {
    animate = false;
    $("#start").val("Start");
  }
}

function main() {
  $("#start").click(startClick);
  doAnimate();
}

$(main);
