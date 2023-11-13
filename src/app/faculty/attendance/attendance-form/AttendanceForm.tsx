import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { DatePicker, Select } from 'antd';
import TopNavbar from '@/app/student/components/topnavbar/TopNavbar';
import StudentCard from './studentcard/StudentCard';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import styles from './AttendanceForm.module.css'
import { IoChevronBackSharp } from 'react-icons/io5';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem } from '@mui/material';

import {Button as AntButton, Modal as AntModal } from 'antd';

interface AttendanceFormData {
  classId: string;
  subjectCode: string;
  subjectSemester: string;
  classDate: string;
  classStartTime: string;
  classEndTime: string;
  students: {
    studentName: string;
    studentUSN: string;
    isPresent: boolean;
  }[];
  presentCount: number;
  absentCount: number;
  recordedTime: string;
  updatedTime: string;
  recordedByEmail: string;
  recordedByName: string;
  classTopic: string;
  classDescription: string;
}

interface TimeOption {
  value: string;
  label: string;
}

interface Student {
  name: string;
  email: string;
  labBatch: string;
  parentPhone: string;
  usn: string;
  parentEmail: string;
  Present: boolean;
}

type StudentsArray = Student[];

const batchOptions = [
  { value: '1', label: 'Batch 1' },
  { value: '2', label: 'Batch 2' },
  { value: '3', label: 'Batch 3' },
];

const convertTo12HourFormat = (timeString: string) => {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'pm' : 'am';
  const formattedHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${formattedHour}:${minutes}${period}`;
};



const generateTimeOptions = (): TimeOption[] => {
  const timeOptions: TimeOption[] = [];
  for (let hour = 9; hour <= 16; hour++) {
    for (let minute = 0; minute < 60; minute += 10) {
      const time = `${hour < 10 ? '0' + hour : hour}:${minute === 0 ? '00' : minute}`;
      const amPm = hour < 12 ? 'AM' : 'PM';
      timeOptions.push({ value: time, label: `${hour % 12 || 12}:${minute === 0 ? '00' : minute} ${amPm}` });
    }
  }
  return timeOptions;
};
const timeOptions = generateTimeOptions();

const AttendanceForm = () => {
  const [attendanceFormData, setAttendanceFormData] = useState<AttendanceFormData>({
    classId: '',
    subjectCode: '',
    subjectSemester: '',
    classDate: '',
    classStartTime: '',
    classEndTime: '',
    students: [],
    presentCount: 0,
    absentCount: 0,
    recordedTime: '',
    updatedTime: '',
    recordedByEmail: '',
    recordedByName: '',
    classTopic: '',
    classDescription: '',
  });

  const [formStep, setFormStep] = useState<number>(1);

  // step 1 states
  const [classDate, setClassDate] = useState<any>(dayjs());
  const [classStartTime, setClassStartTime] = useState<string>('');
  const [classEndTime, setClassEndTime] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [subjectCode, setSubjectCode] = useState<string>('');
  const [isLabSubject, setIsLabSubject] = useState<boolean>(false);
  const [labBatch, setLabBatch] = useState<string>('');


  // form required data states
  const [classSubjectPairList, setClassSubjectPairList] = useState<any[]>([]);
  const [subjectType, setSubjectType] = useState<string>('theory');
  const [step1Error, setStep1Error] = useState<string>('');
  const [isSubjectElective, setIsSubjectElective] = useState<string>('');
  const [subjectSemester, setSubjectSemester] = useState<string>('');
  const [electiveStudentUSN, setElectiveStudentUSN] = useState<string[]>([]);



  // step 2 states

  const [attendance, setAttendance] = useState<any>([]); 
  const [subjectName, setSubjectName] = useState<string>('');
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState<boolean>(false);
  const [presentCount, setPresentCount] = useState(0);
  

  const uniqueClassOptions = classSubjectPairList.reduce((acc, pair) => {
    if (!acc[pair.className]) {
      acc[pair.className] = [];
    }
    acc[pair.className].push(pair);
    return acc;
  }, {});

  const handleSubjectChange = (value: any) => {
    const selectedSubjectCode = value;

    setSubjectCode(selectedSubjectCode);
    setLabBatch('');

    const selectedSubjectPair = classSubjectPairList.find((pair) => pair.code === selectedSubjectCode);
    if (selectedSubjectPair) {
      setSubjectType(selectedSubjectPair.subjectType);
      setIsLabSubject(selectedSubjectPair.subjectType === 'lab');
    }
  };

  const handleStep1Submit = () => {
    if (!classId || !subjectCode || !classDate || !classStartTime || !classEndTime || (isLabSubject && !labBatch)) {
      setStep1Error('Please fill all the fields');
    } else {
      setAllDefaultAttendance();
      setFormStep(2);
      console.log({
        classId,
        subjectCode,
        classDate,
        classStartTime,
        classEndTime,
        isLabSubject,
        labBatch,
      });
    }
  };

  setTimeout(() => {
    setStep1Error('');
  }, 6000);

  useEffect(() => {
    const fetchClassSubjectPairs = async () => {
      try {
        const res = await fetch(`${window.location.origin}/api/faculty/attendance`, {});
        const fetchedData = await res.json();
        setClassSubjectPairList(fetchedData?.classSubjectPairsList || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchClassSubjectPairs();
  }, []);

  useEffect(() => {
    const getSubjectData = async () => {
     
    
      if (classId && subjectCode) {
        const subjectCollectionRef = doc(db, 'database', classId, 'subjects', subjectCode);
        const querySnapshot = await getDoc(subjectCollectionRef);
        if(querySnapshot?.data()){
          const subjectType = querySnapshot.data()?.theoryLab;
          const subjectSemester = querySnapshot.data()?.semester;
          const subjectName = querySnapshot.data()?.name;
          const subjectElective = querySnapshot.data()?.compulsoryElective;

          const electiveStudents = querySnapshot.data()?.electiveStudents;
          setSubjectName(subjectName);
          setSubjectType(subjectType); 
          setSubjectSemester(subjectSemester);
          setIsSubjectElective(subjectElective);
          setElectiveStudentUSN(electiveStudents);
        }

      }
    };
  
    getSubjectData();
  }, [classId, subjectCode]);

  useEffect(() => {
    const getStudents = async () => {
      try {
        if (!classId) {
          // classId is not available, do nothing
          return;
        }

        const res = await fetch(`${window.location.origin}/api/faculty/attendance/students`, {
          method: 'POST', 
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(classId),  // Include classId in the request body
        });

        if (!res.ok) {
          throw new Error('Failed to get students');
        }

        // Handle the response, e.g., parse JSON
        const data = await res.json();
  
        setAttendance(data.StudentData)
        
      } catch (error) {
        // Handle errors, e.g., show an error message
        console.error('Error fetching students', error);
      }
    };

    getStudents();
  }, [classId]);

  const handleStartTimeChange = (value: string) => {
    setClassStartTime(value);
    
    // Parse the hours and minutes
    const [hours, minutes] = value.split(':').map(Number);

    let newHours = (hours + 1) % 24;
    
    if(subjectType === 'lab') {
      newHours = (hours + 2) % 24;
    }

    console.log(attendance)
    
    
    // Format the result as "HH:mm"
    const formattedEndTime = `${newHours < 10 ? '0' : ''}${newHours}:${minutes < 10 ? '0' : ''}${minutes}`;
    
    setClassEndTime(formattedEndTime);
  };

  function toggleAttendance(usn) {
    setAttendance((prevAttendance) => {
      return prevAttendance.map((student) => {
        if (student.usn === usn) {
          return { ...student, Present: !student.Present };
        } else {
          return student;
        }
      });
    });
  }

  function setAllDefaultAttendance() {
    setAttendance((prevAttendance) => {
      return prevAttendance.map((student) => {
        return { ...student, Present: true };
      });
    });
  }

  const filteredStudentCards = attendance
  .filter((student) => isSubjectElective === 'compulsory' || electiveStudentUSN.includes(student.usn))
  .map((student) => (
    <StudentCard
      key={student.usn}
      img={student.Image}
      USN={student.usn}
      Name={student.name}
      Present={student.Present}
      toggle={() => toggleAttendance(student.usn)}
    />
  ));

const batchFilteredStudentCards = (batch) =>
  attendance.map((student) => {
    if (labBatch === null || student.labBatch === batch) {
      return (
        <StudentCard
          key={student.usn}
          img={student.Image}
          USN={student.usn}
          Name={student.name}
          Present={student.Present}
          toggle={() => toggleAttendance(student.usn)}
        />
      );
    }
    return null;
  });

  function ConfirmationModal({ isOpen, onClose, absentStudents}) {
    let presentCount = 0;
    let absentCount = 0;
    labBatch
      ? attendance
          .filter((student) => student.labBatch === labBatch)
          .forEach((student) => {
            if (student.Present) {
              presentCount++;
            } else {
              absentCount++;
            }
          })
      : attendance.forEach((student) => {
          if (student.Present) {
            presentCount++;
          } else {
            absentCount++;
          }
        });

      presentCount = isSubjectElective === "compulsory" ? presentCount : electiveStudentUSN.length
  
    return (
      <><AntModal centered title="Confirm Submission?" open={isOpen} onOk={onClose} onCancel={onClose}     >

       
       


            <p className='pl-1 text-slate-700 font-[Poppins] text-[14px]'><span className='font-[500] text-blue-600 '> Class: </span> {classId} {subjectSemester}-SEM</p>
            <p className='pl-1 text-slate-700 font-[Poppins] text-[14px]'> <span className='font-[500] text-blue-600'> Subject: </span>{subjectName} ({subjectCode}) </p>
            <p className='pl-1 text-slate-700 font-[Poppins] text-[14px]'> <span className='font-[500] text-blue-600'> Date:  </span>{classDate.format('DD MMM, YYYY')}</p>
            <p className='pl-1 text-slate-700 font-[Poppins] text-[14px]'> <span className='font-[500] text-blue-600'> time:  </span>{convertTo12HourFormat(classStartTime) + '-' + convertTo12HourFormat(classEndTime)}</p>
            <p className='pl-1 text-slate-700 font-[Poppins] text-[14px]'> <span className='font-[500] text-blue-600'> Subject Type:  </span>{subjectType}</p>
            {labBatch && (<p className='pl-1 text-slate-700 font-[Poppins] text-[14px]'> <span className='font-[500] text-blue-600'> Lab Batch:  </span>B-{labBatch}</p>)}
            <p className='pl-1 text-slate-700 font-[Poppins] text-[14px]'> <span className='font-[500] text-blue-600'>Students Present:  </span>{presentCount}</p>
            <p className='pl-1 text-slate-700 font-[Poppins] text-[14px]'> <span className='font-[500] text-blue-600'>Students Absent:  </span>{absentCount}</p>
            

    
            <div className="container max-h-[40vh] overflow-y-scroll">
  <div className='font-[Poppins] text-[12px] overflow-auto'>

{absentStudents && (
  <div>
    <span className='pl-1 text-blue-600 font-[Poppins] font-[500] text-[14px]'>Absent Students:</span>
    {absentStudents.map(student => (
      <p key={student.usn} className='px-0'>
        <span className='text-[12px] font-[Poppins] font-semibold '>{student.usn}:</span> {student.name}
      </p>
    ))}
  </div>
)}
  </div>
</div>
     
 

      </AntModal>
      </>
    );
  }


  const handleStep2Submit = async () => {
    setIsConfirmationModalOpen(true);
  }

  const stepOne = () => {
    return (
      <>
      <TopNavbar name='Mark Attendance' /> 
      <div className='flex items-center justify-center flex-col w-[100vw] min-h-[100vh] '>
        <div className='flex items-center flex-col bg-white rounded-xl  w-[90vw] max-w-[500px]  p-4' style={{boxShadow: '0 0 0 1px rgba(0,0,0,.08), 0 -4px 6px rgba(0,0,0,.04)'}}>
          <h2 className='text-center font-[Poppins] font-[500] text-xl p-2 my-6 text-blue-600'> Mark Attendance</h2>
          <div className='flex flex-col items-center'>
            <p className='text-left font-[Poppins] font-[500] text-[12px] mt-5 pl-2 text-slate-600 w-full'>Class</p>
            <Select
              size='large'
              value={classId || undefined}
              onChange={(value) => {
                setClassId(value);
                setSubjectCode('');
                setIsLabSubject(false);
                setLabBatch('');
              }}
              placeholder='Select Class'
              className='w-[80vw] max-w-[450px]  '
              options={Object.keys(uniqueClassOptions).map((ClassId, index) => ({
                value: ClassId,
                label: `${uniqueClassOptions[ClassId][0].classSemester}-SEM ${ClassId}`,
              }))}
            />

            {classId && (
              <>
              <p className='text-left font-[Poppins] font-[500] text-[12px] mt-5 pl-2 text-slate-600 w-full'>Subject</p>
              <Select
                size='large'
                value={subjectCode || undefined}
                onChange={handleSubjectChange}
                className='w-[80vw] max-w-[450px]  text-[16px] mt-[2px]'
                placeholder='Select Subject'
                options={uniqueClassOptions[classId].map((pair, index) => ({
                  value: pair.code,
                  label: pair.subjectName,
                }))} />
                </>
            )}

            {isLabSubject && (
              <>
              <p className='text-left font-[Poppins] font-[500] text-[12px] mt-5 pl-2 text-slate-600 w-full'>Lab Batch</p>
              <Select
                size='large'
                value={labBatch || undefined}
                onChange={(value) => setLabBatch(value)}
                placeholder='Select Lab Batch'
                className='w-[80vw] max-w-[450px] text-[16px] mt-[2px]'
              >
                {batchOptions.map((option) => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
              </>

            )}

            <p className='text-left font-[Poppins] font-[500] text-[12px] mt-5 pl-2 text-slate-600 w-full'>Date</p>  
            <DatePicker
              inputReadOnly
              size='large'
              format={'ddd, MMM D'}
              value={classDate}
              onChange={setClassDate}
              className='w-[80vw] max-w-[450px]  text-[16px] mt-[2px]'
            />

            <div className=' w-[80vw] max-w-[450px] flex flex-row justify-between mb-4 text-[16px]'>

              <div className='w-full'>
            <p className='text-left flex whitespace-nowrap font-[Poppins] mt-5 font-[500] text-[12px] pl-2 text-slate-600  '>Start Time</p>
              <Select
                size='large'
                value={classStartTime || undefined}
                onChange={handleStartTimeChange}
                className='w-[40vw] max-w-[225px] pr-[5px]  text-[16px] mt-[2px]'
                placeholder='Select Start Time'
              >
                {timeOptions.map((option) => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
              </div>

              <div className='w-full'>
              <p className='text-left whitespace-nowrap font-[Poppins] font-[500] text-[12px] mt-5 pl-3  text-slate-600 '>End Time</p>
              <Select
                size='large'
                value={classEndTime || undefined}
                onChange={(value) => setClassEndTime(value)}
                placeholder='Select End Time'
                className='w-[40vw] max-w-[225px] pl-[5px] text-[16px] mt-[2px]'
              >
                {timeOptions.map((option) => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
              </div>

            </div>

            {step1Error && (
              <p className='bg-red-100 w-full text-red-500 rounded-lg mx-4  mb-2 font-[Poppins] p-2 '>{step1Error}</p>
            )}

            <button
              onClick={handleStep1Submit}
              className='bg-blue-500 w-full text-white rounded-lg mx-4 mt-4 mb-4 font-[Poppins] p-2 hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300'
            >
              Next
            </button>
          </div>
        </div>
      </div>
      </>
    );
  };

  const stepTwo = () => {
    return (
      <><div
        className={styles.cardContainer}

      >

        <div className={styles.cardTopBar}>
          <button onClick={() => setFormStep(1)} className='absolute left-0 p-2 m-4 bg-slate-50 rounded-[20px]'>
            <IoChevronBackSharp />
          </button>

          <h4 className='font-[Poppins] text-slate-800 font-[500]  my-4'>Mark Attendance</h4>

        </div>



        <div className='py-[70px] '>

          <div className='flex flex-col border border-solid border-slate-200 rounded my-2 w-[95vw] p-[10px] max-w-[450px]'>
            <h4 className='pl-1 text-blue-600 font-[Poppins] font-[500] text-[16px] pb-1'>Class Details</h4>
            <p className='pl-1 text-slate-700 font-[Poppins] text-[12px]'><span className='font-[500]'> Class: </span> {classId} {subjectSemester}-SEM</p>
            <p className='pl-1 text-slate-700 font-[Poppins] text-[12px]'> <span className='font-[500]'> Subject: </span>{subjectName} ({subjectCode}) </p>
            <p className='pl-1 text-slate-700 font-[Poppins] text-[12px]'> <span className='font-[500]'> Date:  </span>{classDate.format('DD MMM, YYYY')}</p>
            <p className='pl-1 text-slate-700 font-[Poppins] text-[12px]'> <span className='font-[500]'> time:  </span>{convertTo12HourFormat(classStartTime) + '-' + convertTo12HourFormat(classEndTime)}</p>
            <p className='pl-1 text-slate-700 font-[Poppins] text-[12px]'> <span className='font-[500]'> Subject Type:  </span>{subjectType}</p>
            {labBatch && (<p className='pl-1 text-slate-700 font-[Poppins] text-[12px]'> <span className='font-[500]'> Lab Batch:  </span>B-{labBatch}</p>)}
          </div>

          <div className='flex flex-col rounded my-2 w-[95vw] max-w-[450px]'>
            <h6
              className='text-center font-[Poppins] font-[500] text-[12px] mt-5 text-slate-600'
            >
              By Default All the Students are Marked as Present, Please tap on the
              cards to make changes, confirm the Absentees and submit the form.{" "}
            </h6>
            <h6 className='text-center font-[Poppins] font-[500] text-[12px] mt-2 mb-2 text-slate-600'>
              [&nbsp;<span className="bg-[green] text-white rounded-[50%] min-w-[20px] min-h-[20px]"> P </span>&nbsp;-
              Present,&nbsp;&nbsp;<span className="text-absent"> A </span>&nbsp;-
              Absent&nbsp;]{" "}
            </h6>


          </div>

          {!labBatch && filteredStudentCards}
          {labBatch && batchFilteredStudentCards(labBatch)}
        </div>

        <div className={styles.submitButtonContainer}>
          <button
            onClick={() => setFormStep(1)}
            className='bg-slate-100 w-[40vw]  max-w-[180px] text-blue-500 rounded-[15px] mx-2 mt-2 mb-2 font-[Poppins] p-2 px-4 hover:bg-slate-200 focus:outline-none focus:ring focus:ring-blue-300'
          >
            Back
          </button>
          <button
            onClick={handleStep2Submit}
            className='bg-blue-500 w-[40vw] max-w-[180px] text-white rounded-[15px] mx-2  mt-2 mb-2 font-[Poppins] p-2 px-4 hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300'
          >
            Submit
          </button>

        </div>


      </div>
      
      <ConfirmationModal
          isOpen={isConfirmationModalOpen}
          onClose={() => setIsConfirmationModalOpen(false)}
    
          absentStudents={attendance.filter((student) => !student.Present)} />
          
          </>
     
    );
  };

  const stepThree = () => {
    return (
      <div>
        <h1>Step Three</h1>
        <button onClick={() => setFormStep(1)}>Back to Home</button>
      </div>
    );
  };

  return (
    <div>
   
     
     
     
      {formStep === 1 && stepOne()}
      {formStep === 2 && stepTwo()}
      {formStep === 3 && stepThree()}
    </div>
  );
};

export default AttendanceForm;