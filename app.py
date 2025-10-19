

from flask import Flask, render_template, request, redirect, url_for, flash, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, login_required, logout_user, current_user, UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, date, time, timedelta
from config import Config
import io, calendar, os
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage

app = Flask(__name__)
app.config.from_object(Config)

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = "login"


# Models
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(50), nullable=False)  # 'manager','supervisor','team'

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class OvertimeRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    company = db.Column(db.String(200), nullable=False)
    month_year = db.Column(db.String(20), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    section = db.Column(db.String(100), nullable=True)
    employee_name = db.Column(db.String(200), nullable=False)
    employee_code = db.Column(db.String(100), nullable=False)
    date = db.Column(db.Date, nullable=False)
    justification = db.Column(db.Text, nullable=True)
    duty_in = db.Column(db.String(10), nullable=False)
    duty_out = db.Column(db.String(10), nullable=False)
    total_hours = db.Column(db.Float, nullable=False)
    overtime_hours = db.Column(db.Float, nullable=False)
    sign_of_incharge = db.Column(db.String(200), nullable=True)
    created_by = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Helpers
def parse_time_str(tstr):
    parts = tstr.split(":")
    if len(parts) != 2:
        raise ValueError("Time format must be HH:MM")
    return time(int(parts[0]), int(parts[1]))

def calculate_hours(in_str, out_str):
    tin = parse_time_str(in_str)
    tout = parse_time_str(out_str)
    today = date(2000,1,1)
    dt_in = datetime.combine(today, tin)
    dt_out = datetime.combine(today, tout)
    if dt_out <= dt_in:
        dt_out += timedelta(days=1)
    secs = (dt_out - dt_in).total_seconds()
    hours = round(secs / 3600, 2)
    return hours
def overtime_from_total(total_hours, regular_hours=10.0):
    ov = total_hours - regular_hours
    if ov < 0:
        ov = 0.0
    return round(ov, 2)
@app.context_processor
def inject_now():
    return {'now': datetime.now}

# Routes
@app.route("/")
def index():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))

@app.route("/login", methods=["GET","POST"])
def login():
    if request.method == "POST":
        uname = request.form.get("username")
        pwd = request.form.get("password")
        user = User.query.filter_by(username=uname).first()
        if user and user.check_password(pwd):
            login_user(user)
            flash("Logged in successfully", "success")
            return redirect(url_for("dashboard"))
        else:
            flash("Invalid credentials", "danger")
    return render_template("login.html", config=app.config)

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("login"))

@app.route('/dashboard')
@login_required
def dashboard():
    total_employees = User.query.filter_by(role="employee").count()
    total_ot = db.session.query(db.func.sum(OvertimeRecord.overtime_hours)).scalar() or 0
    pending = OvertimeRecord.query.filter_by(sign_of_incharge=None).count()
    recent_records = OvertimeRecord.query.order_by(OvertimeRecord.date.desc()).limit(8).all()

    return render_template(
        "dashboard.html",
        total_employees=total_employees,
        total_ot=round(total_ot, 2),
        pending=pending,
        recent_records=recent_records,  # 👈 This variable goes to the HTML
        config=app.config
    )

@app.route("/add", methods=["GET","POST"])
@login_required
def add_overtime():
    if current_user.role not in ["team","supervisor","manager"]:
        flash("Access denied", "danger")
        return redirect(url_for("dashboard"))
    if request.method=="POST":
        company = request.form.get("company") or app.config['COMPANY_NAME']
        month_year = request.form.get("month_year")
        department = request.form.get("department") or app.config['DEFAULT_DEPARTMENT']
        section = request.form.get("section")
        employee_name = request.form.get("employee_name")
        employee_code = request.form.get("employee_code")
        date_str = request.form.get("date")
        justification = request.form.get("justification")
        duty_in = request.form.get("duty_in")
        duty_out = request.form.get("duty_out")
        sign_of_incharge = request.form.get("sign_of_incharge") if current_user.role in ["supervisor","manager"] else ""
        if not (employee_name and employee_code and date_str and duty_in and duty_out and month_year):
            flash("Please fill required fields", "warning")
            return redirect(url_for("add_overtime"))
        try:
            rec_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            total_hours = calculate_hours(duty_in, duty_out)
            overtime_hours = overtime_from_total(total_hours)
        except Exception as e:
            flash(f"Invalid time or date: {e}", "danger")
            return redirect(url_for("add_overtime"))
        rec = OvertimeRecord(
            company=company,
            month_year=month_year,
            department=department,
            section=section,
            employee_name=employee_name,
            employee_code=employee_code,
            date=rec_date,
            justification=justification,
            duty_in=duty_in,
            duty_out=duty_out,
            total_hours=total_hours,
            overtime_hours=overtime_hours,
            sign_of_incharge=sign_of_incharge,
            created_by=current_user.username
        )
        db.session.add(rec)
        db.session.commit()
        flash("Overtime record saved", "success")
        return redirect(url_for("add_overtime"))
    default_month_year = datetime.now().strftime("%b %Y")
    return render_template("add_overtime.html", default_month_year=default_month_year, config=app.config)

@app.route("/records")
@login_required
def records():
    if current_user.role in ["manager","supervisor"]:
        recs = OvertimeRecord.query.order_by(OvertimeRecord.date.desc()).all()
    else:
        recs = OvertimeRecord.query.filter_by(created_by=current_user.username).order_by(OvertimeRecord.date.desc()).all()
    return render_template("view_records.html", records=recs, config=app.config)

@app.route("/edit/<int:rec_id>", methods=["GET","POST"])
@login_required
def edit_record(rec_id):
    rec = OvertimeRecord.query.get_or_404(rec_id)
    if current_user.role not in ["manager","supervisor"]:
        flash("Only Manager or Supervisor can edit records", "danger")
        return redirect(url_for("records"))
    if request.method=="POST":
        rec.employee_name = request.form.get("employee_name")
        rec.employee_code = request.form.get("employee_code")
        rec.section = request.form.get("section")
        rec.justification = request.form.get("justification")
        rec.duty_in = request.form.get("duty_in")
        rec.duty_out = request.form.get("duty_out")
        rec.sign_of_incharge = request.form.get("sign_of_incharge")
        try:
            rec.total_hours = calculate_hours(rec.duty_in, rec.duty_out)
            rec.overtime_hours = overtime_from_total(rec.total_hours)
            db.session.commit()
            flash("Record updated", "success")
            return redirect(url_for("records"))
        except Exception as e:
            flash(f"Error updating record: {e}", "danger")
    return render_template("edit_overtime.html", rec=rec, config=app.config)

@app.route("/delete/<int:rec_id>", methods=["POST"])
@login_required
def delete_record(rec_id):
    if current_user.role not in ["manager","supervisor"]:
        flash("Only Manager or Supervisor can delete records", "danger")
        return redirect(url_for("records"))
    rec = OvertimeRecord.query.get_or_404(rec_id)
    db.session.delete(rec)
    db.session.commit()
    flash("Record deleted", "success")
    return redirect(url_for("records"))

@app.route('/view_records', methods=['GET'])
@login_required
def view_records():
    date = request.args.get('date')
    employee = request.args.get('employee')
    section = request.args.get('section')

    query = OvertimeRecord.query

    # Filters
    if date:
        query = query.filter(OvertimeRecord.date == date)
    if employee:
        query = query.filter(
            (OvertimeRecord.employee_name.ilike(f"%{employee}%")) |
            (OvertimeRecord.employee_code.ilike(f"%{employee}%"))
        )
    if section:
        query = query.filter(OvertimeRecord.section == section)

    records = query.order_by(OvertimeRecord.date.desc()).all()

    # Dynamic dropdowns
    sections = [s[0] for s in db.session.query(OvertimeRecord.section).distinct().all()]
    employees = [
        {"code": e[0], "name": e[1]}
        for e in db.session.query(OvertimeRecord.employee_code, OvertimeRecord.employee_name).distinct().all()
    ]

    return render_template("view_records.html",
                           records=records,
                           sections=sections,
                           employees=employees)


@app.route('/download_filtered')
@login_required
def download_filtered():
    date = request.args.get('date')
    employee = request.args.get('employee')
    section = request.args.get('section')

    query = OvertimeRecord.query

    if date:
        query = query.filter(OvertimeRecord.date == date)
    if employee:
        query = query.filter(
            (OvertimeRecord.employee_name.ilike(f"%{employee}%")) |
            (OvertimeRecord.employee_code.ilike(f"%{employee}%"))
        )
    if section:
        query = query.filter(OvertimeRecord.section.ilike(f"%{section}%"))

    records = query.all()

    # Generate Excel
    import io
    import openpyxl
    from datetime import datetime

    output = io.BytesIO()
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = "Filtered Records"

    sheet.append(["Employee Code", "Employee Name", "Section", "Date", "Hours", "Status"])

    for r in records:
        sheet.append([r.employee_code, r.employee_name, r.section, str(r.date), r.hours, r.status])

    workbook.save(output)
    output.seek(0)

    filename = f"Filtered_Overtime_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return send_file(output, download_name=filename, as_attachment=True,
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

@app.route("/download_File")
@login_required
def download_File():
    if current_user.role not in ["manager","supervisor"]:
        flash("Only Manager or Supervisor can download File", "danger")
        return redirect(url_for("dashboard"))
    month_year = request.args.get("month_year")
    if not month_year:
        flash("Provide month_year param e.g. ?month_year=Jan 2025", "warning")
        return redirect(url_for("records"))
    try:
        m_str, y_str = month_year.split()
        month = datetime.strptime(m_str, "%b").month
        year = int(y_str)
    except:
        flash("Invalid month_year format. Use e.g. Jan 2025", "danger")
        return redirect(url_for("records"))
    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])
    recs = OvertimeRecord.query.filter(OvertimeRecord.date>=first_day, OvertimeRecord.date<=last_day).order_by(OvertimeRecord.date).all()
    wb = Workbook()
    ws = wb.active
    ws.title = f"Overtime_{month_year.replace(' ','_')}"
    logo_path = app.config.get("LOGO_PATH")
    if logo_path and os.path.exists(logo_path):
        try:
            img = XLImage(logo_path)
            img.width = 120
            img.height = 60
            ws.add_image(img, "A1")
        except:
            pass
    headers = ["Company","Month/Year","Department","Section","Employee Name","Employee Code","Date","Justification","Duty IN Time","Duty OUT Time","Total Hours","Overtime Hours","Sign of Incharge","Submitted By","Submitted At"]
    ws.append([])
    ws.append(headers)
    for r in recs:
        ws.append([r.company,r.month_year,r.department,r.section or "",r.employee_name,r.employee_code,r.date.strftime("%Y-%m-%d"),r.justification or "",r.duty_in,r.duty_out,r.total_hours,r.overtime_hours,r.sign_of_incharge or "",r.created_by,r.created_at.strftime("%Y-%m-%d %H:%M:%S")])
    bio = io.BytesIO()
    wb.save(bio)
    bio.seek(0)
    filename = f"Overtime_{month_year.replace(' ','_')}.xlsx"
    return send_file(
    bio,
    download_name=filename,  # 👈 updated argument
    as_attachment=True,
    mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)
@app.route("/change_password", methods=["GET","POST"])
@login_required
def change_password():
    if request.method=="POST":
        current = request.form.get("current_password")
        newp = request.form.get("new_password")
        confirm = request.form.get("confirm_password")
        if not current_user.check_password(current):
            flash("Current password incorrect", "danger")
            return redirect(url_for("change_password"))
        if newp != confirm:
            flash("New passwords do not match", "warning")
            return redirect(url_for("change_password"))
        current_user.set_password(newp)
        db.session.commit()
        flash("Password updated. Please login again.", "success")
        logout_user()
        return redirect(url_for("login"))
    return render_template("change_password.html", config=app.config)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
